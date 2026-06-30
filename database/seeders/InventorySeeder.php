<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\InventoryAdjustment;
use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Seeder;

class InventorySeeder extends Seeder
{
    public function run(): void
    {
        if (Branch::count() === 0) {
            Branch::create([
                'name' => 'Main Branch',
                'address' => '100 Innovation Way, Tech District',
                'phone' => '+1 (555) 019-2831',
                'email' => 'main@example.com',
                'is_active' => true,
            ]);

            Branch::create([
                'name' => 'City POS Outlet',
                'address' => '404 Retail Ave, Downtown',
                'phone' => '+1 (555) 019-8877',
                'email' => 'citypos@example.com',
                'is_active' => true,
            ]);
        }

        $branches = Branch::all();
        $products = Product::with('variations')->get();
        $user = User::first(); // Grab first user to associate adjustments with

        if ($branches->isEmpty() || $products->isEmpty() || !$user) {
            return;
        }

        foreach ($branches as $branch) {
            foreach ($products as $product) {
                if ($product->has_variations) {
                    foreach ($product->variations as $variation) {
                        // Generate random quantity (some low, some out, some high)
                        $qty = rand(0, 10) === 0 ? 0 : (rand(1, 5) === 1 ? rand(1, 5) : rand(10, 80));
                        $minLevel = rand(3, 8);

                        $inventory = Inventory::firstOrCreate(
                            [
                                'branch_id' => $branch->id,
                                'product_id' => $product->id,
                                'product_variation_id' => $variation->id,
                            ],
                            [
                                'quantity' => $qty,
                                'min_stock_level' => $minLevel,
                            ]
                        );

                        if ($qty > 0 && $inventory->wasRecentlyCreated) {
                            InventoryAdjustment::create([
                                'inventory_id' => $inventory->id,
                                'user_id' => $user->id,
                                'type' => 'set',
                                'quantity' => $qty,
                                'reason' => 'Initial Stock Take',
                            ]);
                        }
                    }
                } else {
                    $qty = rand(0, 10) === 0 ? 0 : (rand(1, 5) === 1 ? rand(1, 5) : rand(10, 80));
                    $minLevel = rand(3, 8);

                    $inventory = Inventory::firstOrCreate(
                        [
                            'branch_id' => $branch->id,
                            'product_id' => $product->id,
                            'product_variation_id' => null,
                        ],
                        [
                            'quantity' => $qty,
                            'min_stock_level' => $minLevel,
                        ]
                    );

                    if ($qty > 0 && $inventory->wasRecentlyCreated) {
                        InventoryAdjustment::create([
                            'inventory_id' => $inventory->id,
                            'user_id' => $user->id,
                            'type' => 'set',
                            'quantity' => $qty,
                            'reason' => 'Initial Stock Take',
                        ]);
                    }
                }
            }
        }
    }
}
