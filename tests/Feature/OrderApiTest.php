<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Inventory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class OrderApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Role $role;
    private Branch $branch;
    private Product $product;
    private Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup role & permissions
        $permission = Permission::create([
            'name' => 'manage_pos',
            'display_name' => 'Manage POS',
        ]);
        $this->role = Role::create([
            'name' => 'Cashier',
            'display_name' => 'Cashier',
        ]);
        $this->role->permissions()->attach($permission->id);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($this->role->id);

        // Setup branch & product
        $this->branch = Branch::create([
            'name' => 'Retail Store A',
            'is_active' => true,
        ]);

        $this->product = Product::create([
            'name' => 'T-Shirt Classic',
            'slug' => 't-shirt-classic',
            'has_variations' => false,
            'selling_price' => 25.00,
            'status' => 'active',
        ]);

        $this->inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'quantity' => 20,
        ]);
    }

    public function test_can_list_orders_with_pos_permission(): void
    {
        Sanctum::actingAs($this->user);

        // Create a completed sale
        $sale = Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
            'order_number' => 'ORD-2026-0001',
            'subtotal' => 50.00,
            'tax_amount' => 5.00,
            'total_amount' => 55.00,
            'payment_method' => 'cash',
        ]);

        $response = $this->getJson('/api/pos/orders');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'data' => [
                '*' => [
                    'id',
                    'order_number',
                    'status',
                    'total_amount',
                    'branch',
                    'user',
                ]
            ]
        ]);
        $this->assertEquals('ORD-2026-0001', $response->json('data.0.order_number'));
    }

    public function test_cannot_list_orders_without_permission(): void
    {
        // Create user without permission
        $unprivilegedUser = User::factory()->create();
        Sanctum::actingAs($unprivilegedUser);

        $response = $this->getJson('/api/pos/orders');
        $response->assertStatus(403);
    }

    public function test_can_cancel_completed_order_and_restock(): void
    {
        Sanctum::actingAs($this->user);

        // Create completed order
        $sale = Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
            'order_number' => 'ORD-2026-9999',
            'subtotal' => 25.00,
            'tax_amount' => 2.50,
            'total_amount' => 27.50,
            'payment_method' => 'cash',
        ]);

        $item = SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->product->id,
            'quantity' => 2,
            'unit_price' => 25.00,
            'total_price' => 50.00,
        ]);

        // Reduce inventory as done on checkout
        $this->inventory->quantity -= 2;
        $this->inventory->save();

        $response = $this->postJson("/api/pos/orders/{$sale->id}/cancel");

        $response->assertStatus(200);
        $response->assertJsonPath('success', true);

        // Check database status
        $this->assertDatabaseHas('sales', [
            'id' => $sale->id,
            'status' => 'cancelled',
        ]);

        // Check stock is returned (back to 20)
        $this->assertDatabaseHas('inventories', [
            'id' => $this->inventory->id,
            'quantity' => 20,
        ]);

        // Check adjustment log is created
        $this->assertDatabaseHas('inventory_adjustments', [
            'inventory_id' => $this->inventory->id,
            'type' => 'increment',
            'quantity' => 2,
        ]);
    }

    public function test_cannot_cancel_non_completed_order(): void
    {
        Sanctum::actingAs($this->user);

        // Create draft order
        $sale = Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'draft',
            'subtotal' => 0.00,
            'total_amount' => 0.00,
        ]);

        $response = $this->postJson("/api/pos/orders/{$sale->id}/cancel");
        $response->assertStatus(422);
    }
}
