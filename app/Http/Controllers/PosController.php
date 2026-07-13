<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

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
}
