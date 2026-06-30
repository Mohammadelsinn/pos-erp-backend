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
            'inventory_id' => 'required|integer|exists:inventories,id',
            'type' => 'required|string|in:increment,decrement,set',
            'quantity' => 'required|integer|min:1',
            'reason' => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $inventory = Inventory::findOrFail($validated['inventory_id']);
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
            ->paginate(15);
            
        return response()->json($history);
    }
}
