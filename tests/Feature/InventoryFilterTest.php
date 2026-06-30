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

class InventoryFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Role $role;
    private Branch $branch;
    private Product $productA;
    private Product $productB;
    private ProductVariation $variationB1;
    private ProductVariation $variationB2;
    private Inventory $invA;
    private Inventory $invB1;
    private Inventory $invB2;

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

        // Setup branch
        $this->branch = Branch::create([
            'name' => 'Warehouse A',
            'is_active' => true,
        ]);

        // Product A (no variations)
        $this->productA = Product::create([
            'name' => 'Simple Item',
            'slug' => 'simple-item',
            'has_variations' => false,
            'cost_price' => 50,
            'selling_price' => 80,
            'sku' => 'SIMPLE',
        ]);

        // Product B (with variations)
        $this->productB = Product::create([
            'name' => 'T-Shirt',
            'slug' => 't-shirt',
            'has_variations' => true,
        ]);

        $this->variationB1 = ProductVariation::create([
            'product_id' => $this->productB->id,
            'size' => 'M',
            'color' => 'Red',
            'cost_price' => 15,
            'selling_price' => 25,
            'sku' => 'TSHIRT-M-RED',
        ]);

        $this->variationB2 = ProductVariation::create([
            'product_id' => $this->productB->id,
            'size' => 'L',
            'color' => 'Blue',
            'cost_price' => 15,
            'selling_price' => 25,
            'sku' => 'TSHIRT-L-BLUE',
        ]);

        // Inventories
        $this->invA = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->productA->id,
            'quantity' => 10,
        ]);

        $this->invB1 = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->productB->id,
            'product_variation_id' => $this->variationB1->id,
            'quantity' => 20,
        ]);

        $this->invB2 = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->productB->id,
            'product_variation_id' => $this->variationB2->id,
            'quantity' => 30,
        ]);
    }

    public function test_can_filter_inventory_by_product_id(): void
    {
        Sanctum::actingAs($this->user);

        // Filter by Product A (Simple Item)
        $response = $this->getJson('/api/inventory?product_id=' . $this->productA->id);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $this->invA->id);

        // Filter by Product B (T-Shirt, should return both variations)
        $response2 = $this->getJson('/api/inventory?product_id=' . $this->productB->id);

        $response2->assertStatus(200);
        $response2->assertJsonCount(2, 'data');
    }

    public function test_can_filter_inventory_by_product_variation_id(): void
    {
        Sanctum::actingAs($this->user);

        // Filter by Variation B1
        $response = $this->getJson('/api/inventory?product_variation_id=' . $this->variationB1->id);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $this->invB1->id);
    }
}
