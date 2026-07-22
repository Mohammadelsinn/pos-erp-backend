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

class RefundApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Branch $branch;
    private Product $productA;
    private Product $productB;
    private Inventory $inventoryA;
    private Inventory $inventoryB;

    protected function setUp(): void
    {
        parent::setUp();

        $permission = Permission::create([
            'name' => 'manage_orders',
            'display_name' => 'Manage Orders',
        ]);
        $role = Role::create([
            'name' => 'Manager',
            'display_name' => 'Manager',
        ]);
        $role->permissions()->attach($permission->id);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($role->id);

        $this->branch = Branch::create([
            'name' => 'Retail Store A',
            'is_active' => true,
        ]);

        $this->productA = Product::create([
            'name' => 'T-Shirt Classic',
            'slug' => 't-shirt-classic',
            'has_variations' => false,
            'selling_price' => 25.00,
            'tax' => 0,
            'status' => 'active',
        ]);

        $this->productB = Product::create([
            'name' => 'Hoodie Classic',
            'slug' => 'hoodie-classic',
            'has_variations' => false,
            'selling_price' => 40.00,
            'tax' => 0,
            'status' => 'active',
        ]);

        $this->inventoryA = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->productA->id,
            'quantity' => 18,
        ]);

        $this->inventoryB = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->productB->id,
            'quantity' => 10,
        ]);
    }

    private function completedOrder(int $quantity = 2): Sale
    {
        $sale = Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
            'order_number' => 'ORD-2026-REF-' . uniqid(),
            'subtotal' => 25.00 * $quantity,
            'tax_amount' => 0,
            'total_amount' => 25.00 * $quantity,
            'payment_method' => 'cash',
            'payment_status' => 'paid',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $this->productA->id,
            'quantity' => $quantity,
            'unit_price' => 25.00,
            'total_price' => 25.00 * $quantity,
        ]);

        // Reduce inventory as done on checkout
        $this->inventoryA->quantity -= $quantity;
        $this->inventoryA->save();

        return $sale->load('items');
    }

    public function test_can_fully_refund_completed_order(): void
    {
        Sanctum::actingAs($this->user);

        $sale = $this->completedOrder(2);

        $response = $this->postJson("/api/orders/{$sale->id}/refund", [
            'reason' => 'Customer changed their mind',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('type', 'full');
        $response->assertJsonPath('status', 'completed');
        $response->assertJsonPath('total_amount', '50.00');

        $this->assertDatabaseHas('sales', [
            'id' => $sale->id,
            'status' => 'refunded',
            'payment_status' => 'refunded',
        ]);

        $this->assertDatabaseHas('inventories', [
            'id' => $this->inventoryA->id,
            'quantity' => 18,
        ]);

        $this->assertDatabaseHas('inventory_adjustments', [
            'inventory_id' => $this->inventoryA->id,
            'type' => 'increment',
            'quantity' => 2,
        ]);

        $this->assertDatabaseHas('refund_items', [
            'order_item_id' => $sale->items->first()->id,
            'quantity' => 2,
        ]);

        // Refunded orders must stay visible through the orders API, not 404
        $show = $this->getJson("/api/orders/{$sale->id}");
        $show->assertStatus(200);
        $show->assertJsonPath('status', 'refunded');
    }

    public function test_cannot_refund_non_completed_order(): void
    {
        Sanctum::actingAs($this->user);

        $sale = Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'draft',
            'subtotal' => 0,
            'total_amount' => 0,
        ]);

        $response = $this->postJson("/api/orders/{$sale->id}/refund", [
            'reason' => 'N/A',
        ]);

        $response->assertStatus(422);
    }

    public function test_can_partially_refund_order(): void
    {
        Sanctum::actingAs($this->user);

        $sale = $this->completedOrder(4);
        $item = $sale->items->first();

        $response = $this->postJson("/api/orders/{$sale->id}/partial-refund", [
            'reason' => 'One item damaged',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('type', 'partial');
        $response->assertJsonPath('total_amount', '25.00');

        // Order stays completed for partial refunds
        $this->assertDatabaseHas('sales', [
            'id' => $sale->id,
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('inventories', [
            'id' => $this->inventoryA->id,
            'quantity' => 15, // 18 - 4 (checkout) + 1 (refund)
        ]);
    }

    public function test_partial_refund_rejects_quantity_beyond_remaining(): void
    {
        Sanctum::actingAs($this->user);

        $sale = $this->completedOrder(2);
        $item = $sale->items->first();

        $response = $this->postJson("/api/orders/{$sale->id}/partial-refund", [
            'reason' => 'Too many',
            'items' => [
                ['order_item_id' => $item->id, 'quantity' => 5],
            ],
        ]);

        $response->assertStatus(422);
    }

    public function test_can_exchange_items(): void
    {
        Sanctum::actingAs($this->user);

        $sale = $this->completedOrder(1);
        $item = $sale->items->first();

        $response = $this->postJson("/api/orders/{$sale->id}/exchange", [
            'reason' => 'Wrong size',
            'return_items' => [
                ['order_item_id' => $item->id, 'quantity' => 1],
            ],
            'new_items' => [
                ['product_id' => $this->productB->id, 'quantity' => 1],
            ],
        ]);

        $response->assertStatus(201);
        $this->assertEquals(25.0, $response->json('returned_value'));
        $this->assertEquals(40.0, $response->json('new_items_value'));
        $this->assertEquals(15.0, $response->json('balance_due'));

        // Returned product restocked
        $this->assertDatabaseHas('inventories', [
            'id' => $this->inventoryA->id,
            'quantity' => 18,
        ]);

        // New product decremented
        $this->assertDatabaseHas('inventories', [
            'id' => $this->inventoryB->id,
            'quantity' => 9,
        ]);

        // New sale item added to the order
        $this->assertDatabaseHas('sale_items', [
            'sale_id' => $sale->id,
            'product_id' => $this->productB->id,
            'quantity' => 1,
        ]);

        // Original order totals are left untouched — the price difference is reported
        // back via returned_value / new_items_value / balance_due instead
        $this->assertDatabaseHas('sales', [
            'id' => $sale->id,
            'total_amount' => 25.00,
        ]);
    }

    public function test_refund_routes_require_manage_orders_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Sanctum::actingAs($unprivilegedUser);

        $sale = $this->completedOrder(1);

        $response = $this->postJson("/api/orders/{$sale->id}/refund", [
            'reason' => 'N/A',
        ]);

        $response->assertStatus(403);
    }
}
