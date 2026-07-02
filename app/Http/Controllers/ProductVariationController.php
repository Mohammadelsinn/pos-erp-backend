<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductVariationController extends Controller
{
    public function index(Product $product): JsonResponse
    {
        return response()->json($product->variations);
    }

    public function store(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['required', 'string', 'max:255', 'unique:product_variations,sku'],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:product_variations,barcode'],
            'cost_price' => ['required', 'numeric', 'min:0'],
            'selling_price' => ['required', 'numeric', 'min:0.01'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $warnings = $this->priceWarning($data['cost_price'], $data['selling_price']);

        $variation = $product->variations()->create($data);

        return response()->json(array_merge($variation->toArray(), ['warnings' => $warnings]), 201);
    }

    public function show(Product $product, ProductVariation $variation): JsonResponse
    {
        $this->ensureBelongsToProduct($product, $variation);

        return response()->json($variation);
    }

    public function update(Request $request, Product $product, ProductVariation $variation): JsonResponse
    {
        $this->ensureBelongsToProduct($product, $variation);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'sku' => ['sometimes', 'string', 'max:255', 'unique:product_variations,sku,' . $variation->id],
            'barcode' => ['nullable', 'string', 'max:255', 'unique:product_variations,barcode,' . $variation->id],
            'cost_price' => ['sometimes', 'numeric', 'min:0'],
            'selling_price' => ['sometimes', 'numeric', 'min:0.01'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $variation->update($data);

        $warnings = $this->priceWarning($variation->cost_price, $variation->selling_price);

        return response()->json(array_merge($variation->toArray(), ['warnings' => $warnings]));
    }

    public function destroy(Product $product, ProductVariation $variation): JsonResponse
    {
        $this->ensureBelongsToProduct($product, $variation);

        $variation->delete();

        return response()->json(['message' => 'Variation deleted successfully']);
    }

    public function toggleStatus(Product $product, ProductVariation $variation): JsonResponse
    {
        $this->ensureBelongsToProduct($product, $variation);

        $variation->update(['is_active' => ! $variation->is_active]);

        $status = $variation->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "Variation {$status}.",
            'variation' => $variation,
        ]);
    }

    private function priceWarning($costPrice, $sellingPrice): array
    {
        if ($sellingPrice < $costPrice) {
            return ["Selling price ({$sellingPrice}) is lower than cost price ({$costPrice})."];
        }

        return [];
    }

    private function ensureBelongsToProduct(Product $product, ProductVariation $variation): void
    {
        abort_unless($variation->product_id === $product->id, 404);
    }
}
