<?php

namespace App\Http\Controllers;

use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseOrderController extends Controller
{
    private const STATUSES = ['draft', 'ordered', 'partially_received', 'received', 'cancelled'];

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

        $purchaseOrder->update(['status' => $validated['status']]);
        $purchaseOrder->load(['supplier', 'user', 'items.product', 'items.variation']);

        return response()->json($purchaseOrder);
    }
}
