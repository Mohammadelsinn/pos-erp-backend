<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProductImageController extends Controller
{
    public function store(Request $request, Product $product): JsonResponse
    {
        $request->validate([
            'images'   => ['required', 'array', 'min:1'],
            'images.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $uploaded = [];

        foreach ($request->file('images') as $file) {
            $path = $file->store('products', 'public');

            $image = $product->images()->create([
                'image_path' => $path,
                'is_primary'  => false,
            ]);

            $uploaded[] = $image;
        }

        // Auto-set first image as primary if product has no primary yet
        if (! $product->images()->where('is_primary', true)->exists()) {
            $product->images()->oldest()->first()?->update(['is_primary' => true]);
        }

        return response()->json([
            'message' => count($uploaded) . ' image(s) uploaded.',
            'images'  => $product->images()->get(),
        ], 201);
    }

    public function destroy(Product $product, ProductImage $image): JsonResponse
    {
        abort_if($image->product_id !== $product->id, 404);

        Storage::disk('public')->delete($image->image_path);
        $image->delete();

        // If the deleted image was primary, promote the oldest remaining image
        if ($image->is_primary) {
            $product->images()->oldest()->first()?->update(['is_primary' => true]);
        }

        return response()->json(['message' => 'Image deleted.']);
    }

    public function setPrimary(Product $product, ProductImage $image): JsonResponse
    {
        abort_if($image->product_id !== $product->id, 404);

        $product->images()->update(['is_primary' => false]);
        $image->update(['is_primary' => true]);

        return response()->json([
            'message' => 'Primary image updated.',
            'image'   => $image->fresh(),
        ]);
    }
}
