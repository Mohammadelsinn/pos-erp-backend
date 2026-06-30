<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'variations']);

        // Search
        if ($request->has('search') && !empty($request->search)) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('variations', function ($vq) use ($search) {
                      $vq->where('sku', 'like', "%{$search}%")
                         ->orWhere('barcode', 'like', "%{$search}%");
                  });
            });
        }

        // Category Filter
        if ($request->has('category_id') && !empty($request->category_id)) {
            $query->where('category_id', $request->category_id);
        }

        // Brand Filter
        if ($request->has('brand_id') && !empty($request->brand_id)) {
            $query->where('brand_id', $request->brand_id);
        }

        // Status Filter
        if ($request->has('status') && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Branch Filter
        if ($request->has('branch_id') && !empty($request->branch_id)) {
            $query->whereHas('inventories', function ($q) use ($request) {
                $q->where('branch_id', $request->branch_id);
            });
        }

        // Sorting
        $sortField = $request->get('sort_by', 'created_at');
        $sortDirection = $request->get('sort_dir', 'desc');
        $allowedSorts = ['name', 'sku', 'selling_price', 'created_at', 'status'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortDirection);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Pagination
        $perPage = $request->get('per_page', 10);
        $products = $query->paginate($perPage);

        return response()->json($products);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug',
            'description' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'image_path' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
            'has_variations' => 'required|boolean',
            
            // Base product properties (if not using variations)
            'cost_price' => 'required_without:variations|nullable|numeric|min:0',
            'selling_price' => 'required_without:variations|nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0|max:100',
            'sku' => 'nullable|string|max:255|unique:products,sku',
            'barcode' => 'nullable|string|max:255|unique:products,barcode',
            
            // Variations array
            'variations' => 'required_if:has_variations,true|array',
            'variations.*.size' => 'nullable|string|max:255',
            'variations.*.color' => 'nullable|string|max:255',
            'variations.*.material' => 'nullable|string|max:255',
            'variations.*.sku' => 'required_if:has_variations,true|string|max:255|unique:product_variations,sku',
            'variations.*.barcode' => 'nullable|string|max:255',
            'variations.*.cost_price' => 'required_if:has_variations,true|numeric|min:0',
            'variations.*.selling_price' => 'required_if:has_variations,true|numeric|min:0',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            $originalSlug = $validated['slug'];
            $count = 1;
            while (Product::where('slug', $validated['slug'])->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count++;
            }
        }

        DB::beginTransaction();
        try {
            // Unset variations temporarily to save base product
            $variationsData = $validated['variations'] ?? [];
            unset($validated['variations']);

            $product = Product::create($validated);

            if ($product->has_variations) {
                foreach ($variationsData as $var) {
                    $product->variations()->create($var);
                }
            }

            DB::commit();
            $product->load(['category', 'brand', 'variations']);
            return response()->json($product, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create product: ' . $e->getMessage()], 500);
        }
    }

    public function show(Product $product)
    {
        $product->load(['category', 'brand', 'variations']);
        return response()->json($product);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:products,slug,' . $product->id,
            'description' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'brand_id' => 'nullable|integer|exists:brands,id',
            'image_path' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
            'has_variations' => 'required|boolean',
            
            // Base product properties (if not using variations)
            'cost_price' => 'required_without:variations|nullable|numeric|min:0',
            'selling_price' => 'required_without:variations|nullable|numeric|min:0',
            'tax' => 'nullable|numeric|min:0|max:100',
            'sku' => 'nullable|string|max:255|unique:products,sku,' . $product->id,
            'barcode' => 'nullable|string|max:255|unique:products,barcode,' . $product->id,
            
            // Variations array
            'variations' => 'required_if:has_variations,true|array',
            'variations.*.id' => 'nullable|integer|exists:product_variations,id',
            'variations.*.size' => 'nullable|string|max:255',
            'variations.*.color' => 'nullable|string|max:255',
            'variations.*.material' => 'nullable|string|max:255',
            'variations.*.sku' => 'required_if:has_variations,true|string|max:255',
            'variations.*.barcode' => 'nullable|string|max:255',
            'variations.*.cost_price' => 'required_if:has_variations,true|numeric|min:0',
            'variations.*.selling_price' => 'required_if:has_variations,true|numeric|min:0',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']);
            $originalSlug = $validated['slug'];
            $count = 1;
            while (Product::where('slug', $validated['slug'])->where('id', '!=', $product->id)->exists()) {
                $validated['slug'] = $originalSlug . '-' . $count++;
            }
        }

        // Validate SKU uniqueness manually for variations to bypass complex database unique rules
        if ($validated['has_variations']) {
            foreach ($validated['variations'] as $vIndex => $vData) {
                $existingVar = ProductVariation::where('sku', $vData['sku']);
                if (isset($vData['id'])) {
                    $existingVar->where('id', '!=', $vData['id']);
                }
                if ($existingVar->exists()) {
                    return response()->json([
                        'message' => 'The variation SKU "' . $vData['sku'] . '" has already been taken.',
                        'errors' => [
                            "variations.{$vIndex}.sku" => ['The variation SKU has already been taken.']
                        ]
                    ], 422);
                }
            }
        }

        DB::beginTransaction();
        try {
            $variationsData = $validated['variations'] ?? [];
            unset($validated['variations']);

            $product->update($validated);

            if ($product->has_variations) {
                // Get IDs of variations that should be kept
                $keepIds = collect($variationsData)->pluck('id')->filter()->toArray();
                
                // Delete removed variations
                $product->variations()->whereNotIn('id', $keepIds)->delete();

                // Create or update remaining variations
                foreach ($variationsData as $var) {
                    if (isset($var['id'])) {
                        $product->variations()->where('id', $var['id'])->update($var);
                    } else {
                        $product->variations()->create($var);
                    }
                }
            } else {
                // Delete all variations if variations were toggled off
                $product->variations()->delete();
            }

            DB::commit();
            $product->load(['category', 'brand', 'variations']);
            return response()->json($product);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update product: ' . $e->getMessage()], 500);
        }
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(['message' => 'Product deleted successfully']);
    }

    public function toggleStatus(Product $product)
    {
        $product->status = $product->status === 'active' ? 'inactive' : 'active';
        $product->save();
        return response()->json($product);
    }

    public function bulkDelete(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:products,id',
        ]);

        Product::whereIn('id', $request->ids)->delete();

        return response()->json(['message' => 'Selected products deleted successfully']);
    }

    public function bulkStatus(Request $request)
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'integer|exists:products,id',
            'status' => 'required|string|in:active,inactive',
        ]);

        Product::whereIn('id', $request->ids)->update(['status' => $request->status]);

        return response()->json(['message' => 'Selected products status updated successfully']);
    }

    public function uploadImage(Request $request)
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg,webp|max:2048',
        ]);

        if ($request->file('image')) {
            $path = $request->file('image')->store('products', 'public');
            return response()->json([
                'path' => $path,
                'url' => url('storage/' . $path)
            ]);
        }

        return response()->json(['message' => 'Image upload failed'], 400);
    }
}
