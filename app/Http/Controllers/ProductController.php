<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with(['category', 'brand']);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        return response()->json($query->paginate($request->integer('per_page', 15)));
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load(['category', 'brand']));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'category_id'    => ['required', 'exists:categories,id'],
            'brand_id'       => ['nullable', 'exists:brands,id'],
            'cost_price'     => ['required', 'numeric', 'min:0'],
            'selling_price'  => ['required', 'numeric', 'min:0'],
            'tax_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        $product = Product::create($data + ['is_active' => true, 'tax_percentage' => 0]);

        return response()->json($product->load(['category', 'brand']), 201);
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name'           => ['sometimes', 'string', 'max:255'],
            'description'    => ['sometimes', 'nullable', 'string'],
            'category_id'    => ['sometimes', 'exists:categories,id'],
            'brand_id'       => ['sometimes', 'nullable', 'exists:brands,id'],
            'cost_price'     => ['sometimes', 'numeric', 'min:0'],
            'selling_price'  => ['sometimes', 'numeric', 'min:0'],
            'tax_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'is_active'      => ['sometimes', 'boolean'],
        ]);

        $product->update($data);

        return response()->json($product->load(['category', 'brand']));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(['message' => 'Product deleted.']);
    }

    public function toggleStatus(Product $product): JsonResponse
    {
        $product->update(['is_active' => ! $product->is_active]);

        $status = $product->is_active ? 'activated' : 'deactivated';

        return response()->json([
            'message' => "Product {$status}.",
            'product' => $product->load(['category', 'brand']),
        ]);
    }
}
