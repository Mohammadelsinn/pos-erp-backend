<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $query = Inventory::with(['product.category', 'product.brand', 'variation', 'branch']);

        // Branch Filter
        if ($request->filled('branch_id')) {
            $query->where('branch_id', $request->branch_id);
        }

        // Product Filter
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        // Product Variation Filter
        if ($request->filled('product_variation_id')) {
            $query->where('product_variation_id', $request->product_variation_id);
        }

        // Stock Status Filter
        if ($request->filled('status')) {
            $status = $request->status;
            if ($status === 'out_of_stock') {
                $query->where('quantity', '<=', 0);
            } elseif ($status === 'low_stock') {
                $query->where('quantity', '>', 0)
                      ->whereRaw('quantity <= min_stock_level');
            } elseif ($status === 'in_stock') {
                $query->whereRaw('quantity > min_stock_level');
            }
        }

        // Search Product Name, SKU, Barcode
        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('product', function ($pq) use ($search) {
                $pq->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            })->orWhereHas('variation', function ($vq) use ($search) {
                $vq->where('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $perPage = $request->get('per_page', 10);
        return response()->json($query->paginate($perPage));
    }

    public function adjust(Request $request)
    {
        $validated = $request->validate([
            'inventory_id' => 'required_without_all:branch_id,product_id|nullable|integer|exists:inventories,id',
            'branch_id' => 'required_without:inventory_id|nullable|integer|exists:branches,id',
            'product_id' => 'required_without:inventory_id|nullable|integer|exists:products,id',
            'product_variation_id' => 'nullable|integer|exists:product_variations,id',
            'type' => 'required|string|in:increment,decrement,set',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            if ($request->filled('inventory_id')) {
                $inventory = Inventory::findOrFail($validated['inventory_id']);
            } else {
                $inventory = Inventory::firstOrCreate([
                    'branch_id' => $validated['branch_id'],
                    'product_id' => $validated['product_id'],
                    'product_variation_id' => $validated['product_variation_id'] ?? null,
                ], [
                    'quantity' => 0,
                    'min_stock_level' => 5,
                ]);
            }
            $oldQty = $inventory->quantity;
            $delta = $validated['quantity'];

            if ($validated['type'] === 'increment') {
                $inventory->quantity += $delta;
            } elseif ($validated['type'] === 'decrement') {
                $inventory->quantity = max(0, $inventory->quantity - $delta);
                // Delta adjusted for logs in case decrement exceeds stock
                $delta = $oldQty - $inventory->quantity;
            } else { // set
                $inventory->quantity = $delta;
                $delta = $inventory->quantity - $oldQty;
            }

            $inventory->save();

            // Create adjustment audit log
            InventoryAdjustment::create([
                'inventory_id' => $inventory->id,
                'user_id' => Auth::id(),
                'type' => $validated['type'],
                'quantity' => $delta,
                'reason' => $validated['reason'] ?: 'Manual Stock Adjustment',
            ]);

            DB::commit();
            
            $inventory->load(['product.category', 'product.brand', 'variation', 'branch']);
            return response()->json($inventory);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to adjust stock: ' . $e->getMessage()], 500);
        }
    }

    public function history(Inventory $inventory)
    {
        $history = InventoryAdjustment::where('inventory_id', $inventory->id)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(15);
            
        return response()->json($history);
    }

    public function allHistory(Request $request)
    {
        $query = InventoryAdjustment::with([
            'inventory.product',
            'inventory.branch',
            'inventory.variation',
            'user'
        ]);

        if ($request->filled('branch_id')) {
            $query->whereHas('inventory', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        if ($request->filled('product_id')) {
            $query->whereHas('inventory', function ($q) use ($request) {
                $q->where('product_id', $request->product_id);
            });
        }

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('inventory.product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%");
            });
        }

        $history = $query->orderBy('created_at', 'desc')->orderBy('id', 'desc')->paginate(15);
        return response()->json($history);
    }
}
