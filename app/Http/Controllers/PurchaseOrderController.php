<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    private const STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];

    // Cancellation is allowed from any non-terminal state; otherwise the lifecycle only moves forward.
    private const ALLOWED_TRANSITIONS = [
        'draft' => ['ordered', 'cancelled'],
        'ordered' => ['partially_received', 'received', 'cancelled'],
        'partially_received' => ['received', 'cancelled'],
        'received' => [],
        'cancelled' => [],
    ];

    public function index(Request $request)
    {
        $query = PurchaseOrder::with(['supplier', 'user']);

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('supplier', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 10);
        return response()->json($query->orderBy('created_at', 'desc')->paginate($perPage));
    }

    public function show(PurchaseOrder $purchaseOrder)
    {
        $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);
        return response()->json($purchaseOrder);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'supplier_id' => 'required|integer|exists:suppliers,id',
            'status' => 'nullable|string|in:' . implode(',', self::STATUSES),
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'items.*.quantity_ordered' => 'required|integer|min:1',
            'items.*.unit_cost' => 'required|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $totalAmount = 0;
            foreach ($validated['items'] as $item) {
                $totalAmount += $item['quantity_ordered'] * $item['unit_cost'];
            }

            $purchaseOrder = PurchaseOrder::create([
                'supplier_id' => $validated['supplier_id'],
                'user_id' => Auth::id(),
                'status' => $validated['status'] ?? 'draft',
                'notes' => $validated['notes'] ?? null,
                'total_amount' => $totalAmount,
            ]);

            foreach ($validated['items'] as $item) {
                $purchaseOrder->items()->create([
                    'product_id' => $item['product_id'],
                    'product_variation_id' => $item['product_variation_id'] ?? null,
                    'quantity_ordered' => $item['quantity_ordered'],
                    'quantity_received' => 0,
                    'unit_cost' => $item['unit_cost'],
                    'total_cost' => $item['quantity_ordered'] * $item['unit_cost'],
                ]);
            }

            DB::commit();
            $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);
            return response()->json($purchaseOrder, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create purchase order: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'supplier_id' => 'sometimes|integer|exists:suppliers,id',
            'notes' => 'nullable|string',
            'items' => 'sometimes|array|min:1',
            'items.*.id' => 'nullable|integer|exists:purchase_order_items,id',
            'items.*.product_id' => 'required_with:items|integer|exists:products,id',
            'items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'items.*.quantity_ordered' => 'required_with:items|integer|min:1',
            'items.*.quantity_received' => 'nullable|integer|min:0',
            'items.*.unit_cost' => 'required_with:items|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            $itemsData = $validated['items'] ?? null;
            unset($validated['items']);

            $purchaseOrder->update($validated);

            if ($itemsData !== null) {
                $keepIds = collect($itemsData)->pluck('id')->filter()->toArray();
                $purchaseOrder->items()->whereNotIn('id', $keepIds)->delete();

                $totalAmount = 0;
                foreach ($itemsData as $item) {
                    $totalCost = $item['quantity_ordered'] * $item['unit_cost'];
                    $totalAmount += $totalCost;

                    $payload = [
                        'product_id' => $item['product_id'],
                        'product_variation_id' => $item['product_variation_id'] ?? null,
                        'quantity_ordered' => $item['quantity_ordered'],
                        'quantity_received' => $item['quantity_received'] ?? 0,
                        'unit_cost' => $item['unit_cost'],
                        'total_cost' => $totalCost,
                    ];

                    if (isset($item['id'])) {
                        $purchaseOrder->items()->where('id', $item['id'])->update($payload);
                    } else {
                        $purchaseOrder->items()->create($payload);
                    }
                }

                $purchaseOrder->update(['total_amount' => $totalAmount]);
            }

            DB::commit();
            $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);
            return response()->json($purchaseOrder);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update purchase order: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(PurchaseOrder $purchaseOrder)
    {
        if ($purchaseOrder->status !== 'draft') {
            return response()->json(['message' => 'Only draft purchase orders can be deleted.'], 422);
        }

        $purchaseOrder->delete();
        return response()->json(['message' => 'Purchase order deleted successfully']);
    }

    public function updateStatus(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:' . implode(',', self::STATUSES),
        ]);

        $allowed = self::ALLOWED_TRANSITIONS[$purchaseOrder->status] ?? [];
        if (! in_array($validated['status'], $allowed)) {
            return response()->json([
                'message' => "Cannot transition purchase order from '{$purchaseOrder->status}' to '{$validated['status']}'.",
            ], 422);
        }

        $purchaseOrder->update(['status' => $validated['status']]);
        $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);

        return response()->json($purchaseOrder);
    }

    public function receive(Request $request, PurchaseOrder $purchaseOrder)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'items' => 'required|array|min:1',
            'items.*.purchase_order_item_id' => 'required|integer|exists:purchase_order_items,id',
            'items.*.quantity_received' => 'required|integer|min:1',
        ]);

        if ($purchaseOrder->status === 'draft') {
            return response()->json(['message' => 'Purchase order must be ordered before receiving stock.'], 422);
        }

        if (in_array($purchaseOrder->status, ['received', 'cancelled'])) {
            return response()->json(['message' => "Cannot receive stock for a purchase order with status '{$purchaseOrder->status}'."], 422);
        }

        // Resolve and validate each line against its remaining quantity before writing anything
        $receipts = [];
        $errors = [];
        foreach ($validated['items'] as $itemData) {
            $item = $purchaseOrder->items()->find($itemData['purchase_order_item_id']);

            if (! $item) {
                $errors[] = "Item #{$itemData['purchase_order_item_id']} does not belong to this purchase order.";
                continue;
            }

            $remaining = $item->quantity_ordered - $item->quantity_received;
            $qty = $itemData['quantity_received'];

            if ($qty > $remaining) {
                $errors[] = "Cannot receive {$qty} units for item #{$item->id}; only {$remaining} remaining.";
                continue;
            }

            $receipts[] = ['item' => $item, 'qty' => $qty];
        }

        if (! empty($errors)) {
            return response()->json(['message' => 'Invalid receive quantities.', 'errors' => $errors], 422);
        }

        DB::beginTransaction();
        try {
            foreach ($receipts as $receipt) {
                $item = $receipt['item'];
                $qty = $receipt['qty'];

                $item->quantity_received += $qty;
                $item->save();

                $inventory = Inventory::firstOrCreate([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item->product_id,
                    'product_variation_id' => $item->product_variation_id,
                ], [
                    'quantity' => 0,
                    'min_stock_level' => 5,
                ]);

                $inventory->quantity += $qty;
                $inventory->save();

                InventoryAdjustment::create([
                    'inventory_id' => $inventory->id,
                    'product_id' => $inventory->product_id,
                    'product_variation_id' => $inventory->product_variation_id,
                    'branch_id' => $inventory->branch_id,
                    'user_id' => Auth::id(),
                    'type' => 'in',
                    'quantity' => $qty,
                    'reason' => 'Purchase order receipt',
                    'reference_type' => PurchaseOrder::class,
                    'reference_id' => $purchaseOrder->id,
                    'notes' => "Received against PO #{$purchaseOrder->id}",
                ]);
            }

            $purchaseOrder->load('items');
            $allReceived = $purchaseOrder->items->every(fn ($i) => $i->quantity_received >= $i->quantity_ordered);
            $anyReceived = $purchaseOrder->items->sum('quantity_received') > 0;

            $purchaseOrder->status = $allReceived ? 'received' : ($anyReceived ? 'partially_received' : $purchaseOrder->status);
            $purchaseOrder->save();

            DB::commit();

            $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);
            return response()->json($purchaseOrder);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to receive stock: ' . $e->getMessage()], 500);
        }
    }
}
