<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductVariation;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductBranchInventorySyncTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $productsPermission = Permission::create([
            'name' => 'manage_products',
            'display_name' => 'Manage Products',
        ]);
        $branchesPermission = Permission::create([
            'name' => 'manage_branches',
            'display_name' => 'Manage Branches',
        ]);

        $role = Role::create([
            'name' => 'Catalog Manager',
            'display_name' => 'Catalog Manager',
        ]);
        $role->permissions()->attach([$productsPermission->id, $branchesPermission->id]);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($role->id);
    }

    public function test_creating_a_product_auto_creates_inventory_for_every_active_branch(): void
    {
        Sanctum::actingAs($this->user);

        $activeBranchA = Branch::create(['name' => 'Main Branch', 'is_active' => true]);
        $activeBranchB = Branch::create(['name' => 'City Outlet', 'is_active' => true]);
        $inactiveBranch = Branch::create(['name' => 'Closed Branch', 'is_active' => false]);

        $response = $this->postJson('/api/products', [
            'name' => 'Simple Widget',
            'has_variations' => false,
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        $response->assertStatus(201);
        $productId = $response->json('id');

        $this->assertEquals(2, Inventory::where('product_id', $productId)->count());

        foreach ([$activeBranchA, $activeBranchB] as $branch) {
            $this->assertDatabaseHas('inventories', [
                'branch_id' => $branch->id,
                'product_id' => $productId,
                'product_variation_id' => null,
                'quantity' => 0,
                'min_stock_level' => 5,
            ]);
        }

        $this->assertDatabaseMissing('inventories', [
            'branch_id' => $inactiveBranch->id,
            'product_id' => $productId,
        ]);
    }

    public function test_creating_a_product_with_variations_auto_creates_inventory_per_variation(): void
    {
        Sanctum::actingAs($this->user);

        $branch = Branch::create(['name' => 'Main Branch', 'is_active' => true]);

        $response = $this->postJson('/api/products', [
            'name' => 'Variant Shirt',
            'has_variations' => true,
            'variations' => [
                ['size' => 'S', 'sku' => 'SHIRT-S', 'cost_price' => 5, 'selling_price' => 10],
                ['size' => 'M', 'sku' => 'SHIRT-M', 'cost_price' => 5, 'selling_price' => 10],
            ],
        ]);

        $response->assertStatus(201);
        $productId = $response->json('id');
        $variationIds = ProductVariation::where('product_id', $productId)->pluck('id');

        $this->assertEquals(2, $variationIds->count());
        $this->assertEquals(2, Inventory::where('product_id', $productId)->count());

        foreach ($variationIds as $variationId) {
            $this->assertDatabaseHas('inventories', [
                'branch_id' => $branch->id,
                'product_id' => $productId,
                'product_variation_id' => $variationId,
                'quantity' => 0,
                'min_stock_level' => 5,
            ]);
        }
    }

    public function test_updating_an_existing_product_fills_in_missing_inventory_for_new_branches(): void
    {
        Sanctum::actingAs($this->user);

        $originalBranch = Branch::create(['name' => 'Main Branch', 'is_active' => true]);

        $product = Product::create([
            'name' => 'Legacy Product',
            'slug' => 'legacy-product',
            'has_variations' => false,
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        // Simulate the pre-fix state: only the original branch has an inventory row.
        Inventory::create([
            'branch_id' => $originalBranch->id,
            'product_id' => $product->id,
            'product_variation_id' => null,
            'quantity' => 12,
            'min_stock_level' => 5,
        ]);

        $newBranch = Branch::create(['name' => 'New Branch', 'is_active' => true]);

        $this->assertDatabaseMissing('inventories', [
            'branch_id' => $newBranch->id,
            'product_id' => $product->id,
        ]);

        $response = $this->putJson("/api/products/{$product->id}", [
            'name' => 'Legacy Product',
            'has_variations' => false,
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        $response->assertStatus(200);

        // The pre-existing inventory row (with its real quantity) must be untouched.
        $this->assertDatabaseHas('inventories', [
            'branch_id' => $originalBranch->id,
            'product_id' => $product->id,
            'quantity' => 12,
        ]);

        // The gap for the newer branch must now be filled in.
        $this->assertDatabaseHas('inventories', [
            'branch_id' => $newBranch->id,
            'product_id' => $product->id,
            'product_variation_id' => null,
            'quantity' => 0,
            'min_stock_level' => 5,
        ]);
    }

    public function test_creating_a_branch_auto_creates_inventory_for_every_active_product(): void
    {
        Sanctum::actingAs($this->user);

        $activeProduct = Product::create([
            'name' => 'Active Product',
            'slug' => 'active-product',
            'has_variations' => false,
            'status' => 'active',
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        $inactiveProduct = Product::create([
            'name' => 'Inactive Product',
            'slug' => 'inactive-product',
            'has_variations' => false,
            'status' => 'inactive',
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        $variantProduct = Product::create([
            'name' => 'Variant Product',
            'slug' => 'variant-product',
            'has_variations' => true,
            'status' => 'active',
        ]);
        $variation = ProductVariation::create([
            'product_id' => $variantProduct->id,
            'size' => 'One Size',
            'sku' => 'VARIANT-OS',
            'cost_price' => 5,
            'selling_price' => 10,
        ]);

        $response = $this->postJson('/api/branches', [
            'name' => 'Brand New Branch',
        ]);

        $response->assertStatus(201);
        $branchId = $response->json('id');

        $this->assertDatabaseHas('inventories', [
            'branch_id' => $branchId,
            'product_id' => $activeProduct->id,
            'product_variation_id' => null,
            'quantity' => 0,
            'min_stock_level' => 5,
        ]);

        $this->assertDatabaseHas('inventories', [
            'branch_id' => $branchId,
            'product_id' => $variantProduct->id,
            'product_variation_id' => $variation->id,
            'quantity' => 0,
            'min_stock_level' => 5,
        ]);

        $this->assertDatabaseMissing('inventories', [
            'branch_id' => $branchId,
            'product_id' => $inactiveProduct->id,
        ]);
    }
}
