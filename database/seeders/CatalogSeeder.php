<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Categories
        $categories = [
            ['name' => 'Electronics', 'slug' => 'electronics', 'description' => 'Gadgets, devices, and accessories.'],
            ['name' => 'Apparel & Footwear', 'slug' => 'apparel-footwear', 'description' => 'Clothing, shoes, and sportswear.'],
            ['name' => 'Home & Living', 'slug' => 'home-living', 'description' => 'Furniture, kitchenware, and decor.'],
            ['name' => 'Food & Beverages', 'slug' => 'food-beverages', 'description' => 'Groceries, snacks, and drinks.'],
        ];

        $categoryModels = [];
        foreach ($categories as $cat) {
            $categoryModels[$cat['name']] = Category::firstOrCreate(['slug' => $cat['slug']], $cat);
        }

        // 2. Brands
        $brands = [
            ['name' => 'Apple', 'slug' => 'apple', 'description' => 'Premium smartphones and tech accessories.'],
            ['name' => 'Nike', 'slug' => 'nike', 'description' => 'Athletic apparel and running shoes.'],
            ['name' => 'Samsung', 'slug' => 'samsung', 'description' => 'Consumer electronics and devices.'],
            ['name' => 'Ikea', 'slug' => 'ikea', 'description' => 'Affordable Swedish furniture and home products.'],
        ];

        $brandModels = [];
        foreach ($brands as $br) {
            $brandModels[$br['name']] = Brand::firstOrCreate(['slug' => $br['slug']], $br);
        }

        // 3. Products & Variations
        
        // Single Product 1
        Product::firstOrCreate(
            ['slug' => 'ipad-pro-11'],
            [
                'name' => 'iPad Pro 11-inch',
                'description' => 'Apple iPad Pro with M2 Chip, 128GB Storage, WiFi.',
                'category_id' => $categoryModels['Electronics']->id,
                'brand_id' => $brandModels['Apple']->id,
                'status' => 'active',
                'has_variations' => false,
                'cost_price' => 750.00,
                'selling_price' => 999.00,
                'tax' => 15.00,
                'sku' => 'APP-IPAD-M2-11',
                'barcode' => '190199220021'
            ]
        );

        // Single Product 2
        Product::firstOrCreate(
            ['slug' => 'samsung-galaxy-s24'],
            [
                'name' => 'Samsung Galaxy S24',
                'description' => 'Samsung Galaxy S24 256GB Dual SIM, Onyx Black.',
                'category_id' => $categoryModels['Electronics']->id,
                'brand_id' => $brandModels['Samsung']->id,
                'status' => 'active',
                'has_variations' => false,
                'cost_price' => 600.00,
                'selling_price' => 849.00,
                'tax' => 15.00,
                'sku' => 'SAM-S24-256G',
                'barcode' => '8806095302912'
            ]
        );

        // Single Product 3 (Inactive)
        Product::firstOrCreate(
            ['slug' => 'ikea-lack-side-table'],
            [
                'name' => 'Ikea Lack Side Table',
                'description' => 'Easy to assemble, lightweight, and easy to move.',
                'category_id' => $categoryModels['Home & Living']->id,
                'brand_id' => $brandModels['Ikea']->id,
                'status' => 'inactive',
                'has_variations' => false,
                'cost_price' => 8.00,
                'selling_price' => 19.99,
                'tax' => 5.00,
                'sku' => 'IKE-LACK-TAB-WH',
                'barcode' => '7318920192031'
            ]
        );

        // Variable Product (Nike Shoes)
        $nikeShoes = Product::firstOrCreate(
            ['slug' => 'nike-air-max-90'],
            [
                'name' => 'Nike Air Max 90',
                'description' => 'Classic running shoes with iconic max air cushioning.',
                'category_id' => $categoryModels['Apparel & Footwear']->id,
                'brand_id' => $brandModels['Nike']->id,
                'status' => 'active',
                'has_variations' => true,
                'tax' => 15.00,
            ]
        );

        // Add Variations
        if ($nikeShoes->variations()->count() === 0) {
            $variations = [
                ['size' => '42', 'color' => 'Black/White', 'material' => 'Leather/Mesh', 'sku' => 'NKE-AM90-42-BKW', 'barcode' => '883019100021', 'cost_price' => 70.00, 'selling_price' => 120.00],
                ['size' => '43', 'color' => 'Black/White', 'material' => 'Leather/Mesh', 'sku' => 'NKE-AM90-43-BKW', 'barcode' => '883019100022', 'cost_price' => 70.00, 'selling_price' => 120.00],
                ['size' => '44', 'color' => 'Black/White', 'material' => 'Leather/Mesh', 'sku' => 'NKE-AM90-44-BKW', 'barcode' => '883019100023', 'cost_price' => 72.00, 'selling_price' => 125.00],
                ['size' => '42', 'color' => 'Triple White', 'material' => 'Leather', 'sku' => 'NKE-AM90-42-WHT', 'barcode' => '883019100031', 'cost_price' => 75.00, 'selling_price' => 130.00],
                ['size' => '43', 'color' => 'Triple White', 'material' => 'Leather', 'sku' => 'NKE-AM90-43-WHT', 'barcode' => '883019100032', 'cost_price' => 75.00, 'selling_price' => 130.00],
            ];

            foreach ($variations as $var) {
                $nikeShoes->variations()->create($var);
            }
        }
    }
}
