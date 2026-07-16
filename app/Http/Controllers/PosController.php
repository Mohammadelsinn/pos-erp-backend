<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PosController extends Controller
{
    public function products(Request $request)
    {
        $branchId = $request->get('branch_id');

        $query = Product::query()
            ->select(['id', 'category_id', 'name', 'sku', 'barcode', 'selling_price', 'tax', 'image_path', 'has_variations'])
            ->where('status', 'active')
            ->with(['category:id,name']);

        // Only products that are sellable: no variations, or at least one active variation
        $query->where(function ($q) {
            $q->where('has_variations', false)
              ->orWhereHas('variations', function ($vq) {
                  $vq->where('is_active', true);
              });
        });

        $query->with(['variations' => function ($vq) {
            $vq->where('is_active', true)
               ->select(['id', 'product_id', 'name', 'size', 'color', 'material', 'sku', 'barcode', 'selling_price', 'tax_percentage']);
        }]);

        $query->with(['inventories' => function ($iq) use ($branchId) {
            $iq->select(['id', 'product_id', 'product_variation_id', 'branch_id', 'quantity']);
            if ($branchId) {
                $iq->where('branch_id', $branchId);
            }
        }]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhereHas('variations', function ($vq) use ($search) {
                      $vq->where('is_active', true)
                         ->where(function ($vq2) use ($search) {
                             $vq2->where('sku', 'like', "%{$search}%")
                                 ->orWhere('barcode', 'like', "%{$search}%");
                         });
                  });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $limit = min((int) $request->get('limit', 50), 100);

        $products = $query->orderBy('name')->limit($limit)->get();

        $data = $products->map(function ($product) {
            $baseStock = $product->inventories
                ->where('product_variation_id', null)
                ->sum('quantity');

            $item = [
                'id' => $product->id,
                'name' => $product->name,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'selling_price' => $product->selling_price,
                'tax' => $product->tax,
                'image' => $product->image_path ? url('storage/' . $product->image_path) : null,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'has_variations' => $product->has_variations,
                'stock_quantity' => $baseStock,
            ];

            if ($product->has_variations) {
                $item['variations'] = $product->variations->map(function ($variation) use ($product) {
                    $variationStock = $product->inventories
                        ->where('product_variation_id', $variation->id)
                        ->sum('quantity');

                    return [
                        'id' => $variation->id,
                        'name' => $variation->name,
                        'size' => $variation->size,
                        'color' => $variation->color,
                        'material' => $variation->material,
                        'capacity' => $variation->capacity,
                        'sku' => $variation->sku,
                        'barcode' => $variation->barcode,
                        'selling_price' => $variation->selling_price,
                        'tax' => $variation->tax_percentage,
                        'stock_quantity' => $variationStock,
                    ];
                })->values();
            }

            return $item;
        });

        return response()->json(['data' => $data]);
    }

    /**
     * Create a new draft sale (cart), optionally seeded with items.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'notes' => 'nullable|string',
            'items' => 'array',
            'items.*.product_id' => 'required_with:items|integer|exists:products,id',
            'items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'items.*.quantity' => 'required_with:items|integer|min:1',
        ]);

        $items = $validated['items'] ?? [];

        foreach ($items as $item) {
            $error = $this->checkStock(
                $validated['branch_id'],
                $item['product_id'],
                $item['product_variation_id'] ?? null,
                $item['quantity']
            );
            if ($error) {
                return response()->json(['message' => $error], 422);
            }
        }

        DB::beginTransaction();
        try {
            $sale = Sale::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => Auth::id(),
                'status' => 'draft',
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($items as $item) {
                $variationId = $item['product_variation_id'] ?? null;
                $unitPrice = $this->unitPriceFor($item['product_id'], $variationId);

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'product_variation_id' => $variationId,
                    'quantity' => $item['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => round($unitPrice * $item['quantity'], 2),
                ]);
            }

            $this->recalculateTotals($sale);

            DB::commit();

            return response()->json($sale->load('items.product', 'items.variation'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create draft sale: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Add an item to an existing draft sale. Increases quantity if the item already exists in the cart.
     */
    public function addItem(Request $request, $saleId)
    {
        $sale = Sale::findOrFail($saleId);

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Only draft sales can be modified.'], 422);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $variationId = $validated['product_variation_id'] ?? null;

        $existingItem = SaleItem::where('sale_id', $sale->id)
            ->where('product_id', $validated['product_id'])
            ->where('product_variation_id', $variationId)
            ->first();

        $newQuantity = ($existingItem->quantity ?? 0) + $validated['quantity'];

        $error = $this->checkStock($sale->branch_id, $validated['product_id'], $variationId, $newQuantity);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        DB::beginTransaction();
        try {
            if ($existingItem) {
                $existingItem->quantity = $newQuantity;
                $existingItem->total_price = round($existingItem->unit_price * $newQuantity, 2);
                $existingItem->save();
            } else {
                $unitPrice = $this->unitPriceFor($validated['product_id'], $variationId);

                SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $validated['product_id'],
                    'product_variation_id' => $variationId,
                    'quantity' => $newQuantity,
                    'unit_price' => $unitPrice,
                    'total_price' => round($unitPrice * $newQuantity, 2),
                ]);
            }

            $this->recalculateTotals($sale);

            DB::commit();

            return response()->json($sale->load('items.product', 'items.variation'), 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to add item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update the quantity of an item already in the cart.
     */
    public function updateItem(Request $request, $saleId, $itemId)
    {
        $sale = Sale::findOrFail($saleId);

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Only draft sales can be modified.'], 422);
        }

        $item = SaleItem::where('sale_id', $sale->id)->findOrFail($itemId);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $error = $this->checkStock($sale->branch_id, $item->product_id, $item->product_variation_id, $validated['quantity']);
        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        DB::beginTransaction();
        try {
            $item->quantity = $validated['quantity'];
            $item->total_price = round($item->unit_price * $validated['quantity'], 2);
            $item->save();

            $this->recalculateTotals($sale);

            DB::commit();

            return response()->json($sale->load('items.product', 'items.variation'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove an item from the cart and recalculate totals.
     */
    public function removeItem($saleId, $itemId)
    {
        $sale = Sale::findOrFail($saleId);

        if ($sale->status !== 'draft') {
            return response()->json(['message' => 'Only draft sales can be modified.'], 422);
        }

        $item = SaleItem::where('sale_id', $sale->id)->findOrFail($itemId);

        DB::beginTransaction();
        try {
            $item->delete();

            $this->recalculateTotals($sale);

            DB::commit();

            return response()->json($sale->load('items.product', 'items.variation'));
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to remove item: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Returns an error message if the requested quantity exceeds available branch stock, null otherwise.
     */
    private function checkStock(int $branchId, int $productId, ?int $variationId, int $neededQuantity): ?string
    {
        $available = Inventory::where('branch_id', $branchId)
            ->where('product_id', $productId)
            ->where('product_variation_id', $variationId)
            ->value('quantity') ?? 0;

        if ($available <= 0) {
            return 'This item is out of stock.';
        }

        if ($neededQuantity > $available) {
            return "Only {$available} unit(s) available in stock.";
        }

        return null;
    }

    private function unitPriceFor(int $productId, ?int $variationId): float
    {
        if ($variationId) {
            return (float) ProductVariation::findOrFail($variationId)->selling_price;
        }

        return (float) Product::findOrFail($productId)->selling_price;
    }

    private function recalculateTotals(Sale $sale): void
    {
        $subtotal = $sale->items()->sum('total_price');

        $sale->subtotal = $subtotal;
        $sale->total_amount = $subtotal - $sale->discount_amount + $sale->tax_amount;
        $sale->save();
    }

    public function checkout(Request $request)
    {
        $validated = $request->validate([
            'branch_id' => 'required|integer|exists:branches,id',
            'subtotal' => 'required|numeric|min:0',
            'discount_amount' => 'required|numeric|min:0',
            'tax_amount' => 'required|numeric|min:0',
            'total_amount' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|integer|exists:products,id',
            'items.*.product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'required|numeric|min:0',
            'items.*.discount_amount' => 'required|numeric|min:0',
            'items.*.tax_amount' => 'required|numeric|min:0',
            'items.*.total_price' => 'required|numeric|min:0',
        ]);

        \DB::beginTransaction();
        try {
            // Create the Sale
            $sale = \App\Models\Sale::create([
                'branch_id' => $validated['branch_id'],
                'user_id' => \Auth::id(),
                'status' => 'completed',
                'subtotal' => $validated['subtotal'],
                'discount_amount' => $validated['discount_amount'],
                'tax_amount' => $validated['tax_amount'],
                'total_amount' => $validated['total_amount'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Save items and adjust stock
            foreach ($validated['items'] as $item) {
                $saleItem = \App\Models\SaleItem::create([
                    'sale_id' => $sale->id,
                    'product_id' => $item['product_id'],
                    'product_variation_id' => $item['product_variation_id'] ?? null,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'],
                    'discount_amount' => $item['discount_amount'],
                    'tax_amount' => $item['tax_amount'],
                    'total_price' => $item['total_price'],
                ]);

                // Find or create inventory for this branch + product/variation
                $inventory = \App\Models\Inventory::firstOrCreate([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $item['product_id'],
                    'product_variation_id' => $item['product_variation_id'] ?? null,
                ], [
                    'quantity' => 0,
                    'min_stock_level' => 5,
                ]);

                // Decrement stock
                $inventory->quantity = max(0, $inventory->quantity - $item['quantity']);
                $inventory->save();

                // Create inventory adjustment audit log
                \App\Models\InventoryAdjustment::create([
                    'inventory_id' => $inventory->id,
                    'product_id' => $inventory->product_id,
                    'product_variation_id' => $inventory->product_variation_id,
                    'branch_id' => $inventory->branch_id,
                    'user_id' => \Auth::id(),
                    'type' => 'out',
                    'quantity' => -$item['quantity'],
                    'reason' => 'POS Sale #' . $sale->id,
                    'reference_type' => 'App\Models\Sale',
                    'reference_id' => $sale->id,
                ]);
            }

            \DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Sale completed successfully',
                'sale_id' => $sale->id,
                'sale' => $sale->load('items.product', 'items.variation'),
            ], 201);

        } catch (\Exception $e) {
            \DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to process checkout: ' . $e->getMessage()
            ], 500);
        }
    }
}
