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

class InventoryAdjustmentApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Role $role;
    private Branch $branch;
    private Product $product;
    private ProductVariation $variation;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup role & permissions
        $permission = Permission::create([
            'name' => 'manage_inventory',
            'display_name' => 'Manage Inventory',
        ]);
        $this->role = Role::create([
            'name' => 'Inventory Manager',
            'display_name' => 'Inventory Manager',
        ]);
        $this->role->permissions()->attach($permission->id);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($this->role->id);

        // Setup branch & product
        $this->branch = Branch::create([
            'name' => 'HQ Warehouse',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'name' => 'Widget Pro',
            'slug' => 'widget-pro',
            'has_variations' => true,
        ]);

        $this->variation = ProductVariation::create([
            'product_id' => $this->product->id,
            'size' => 'S',
            'color' => 'Red',
            'cost_price' => 10,
            'selling_price' => 20,
            'sku' => 'WIDGET-S-RED',
        ]);
    }

    public function test_can_adjust_stock_with_inventory_id(): void
    {
        Sanctum::actingAs($this->user);

        // Pre-create inventory
        $inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'quantity' => 10,
        ]);

        $response = $this->postJson('/api/inventory/adjust', [
            'inventory_id' => $inventory->id,
            'type' => 'increment',
            'quantity' => 5,
            'reason' => 'Audit Correction',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('quantity', 15);
        $this->assertDatabaseHas('inventories', [
            'id' => $inventory->id,
            'quantity' => 15,
        ]);
        $this->assertDatabaseHas('inventory_adjustments', [
            'inventory_id' => $inventory->id,
            'type' => 'increment',
            'quantity' => 5,
            'reason' => 'Audit Correction',
        ]);
    }

    public function test_can_adjust_stock_with_branch_and_product_ids_existing(): void
    {
        Sanctum::actingAs($this->user);

        // Pre-create inventory
        $inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'quantity' => 10,
        ]);

        $response = $this->postJson('/api/inventory/adjust', [
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'type' => 'decrement',
            'quantity' => 3,
            'reason' => 'Damaged Stock',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('quantity', 7);
        $this->assertDatabaseHas('inventories', [
            'id' => $inventory->id,
            'quantity' => 7,
        ]);
    }

    public function test_can_adjust_stock_and_auto_create_missing_inventory(): void
    {
        Sanctum::actingAs($this->user);

        // Ensure no inventory exists
        $this->assertEquals(0, Inventory::count());

        $response = $this->postJson('/api/inventory/adjust', [
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'type' => 'set',
            'quantity' => 25,
            'reason' => 'Stocking Up New Branch',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('quantity', 25);
        $this->assertEquals(1, Inventory::count());

        $this->assertDatabaseHas('inventories', [
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'quantity' => 25,
        ]);
    }

    public function test_can_retrieve_global_movements_history_with_filters(): void
    {
        Sanctum::actingAs($this->user);

        // Create adjustment log records
        $inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'product_variation_id' => $this->variation->id,
            'quantity' => 10,
        ]);

        // Adjust twice
        $this->postJson('/api/inventory/adjust', [
            'inventory_id' => $inventory->id,
            'type' => 'increment',
            'quantity' => 10,
            'reason' => 'Initial Stock',
        ]);
        $this->postJson('/api/inventory/adjust', [
            'inventory_id' => $inventory->id,
            'type' => 'decrement',
            'quantity' => 2,
            'reason' => 'Lost Item',
        ]);

        // Retrieve global history
        $response = $this->getJson('/api/inventory/history');

        $response->assertStatus(200);
        $response->assertJsonCount(2, 'data');
        $response->assertJsonPath('data.0.reason', 'Lost Item');
        $response->assertJsonPath('data.1.reason', 'Initial Stock');

        // Test filtering by type = decrement
        $responseFilterType = $this->getJson('/api/inventory/history?type=decrement');
        $responseFilterType->assertStatus(200);
        $responseFilterType->assertJsonCount(1, 'data');
        $responseFilterType->assertJsonPath('data.0.reason', 'Lost Item');

        // Test search filter
        $responseSearch = $this->getJson('/api/inventory/history?search=Widget');
        $responseSearch->assertStatus(200);
        $responseSearch->assertJsonCount(2, 'data');
    }
}
