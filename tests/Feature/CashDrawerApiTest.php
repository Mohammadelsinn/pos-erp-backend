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

class CashDrawerApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Branch $branch;
    private Product $product;
    private Inventory $inventory;

    protected function setUp(): void
    {
        parent::setUp();

        $permissions = collect(['manage_cash_drawer', 'manage_pos', 'manage_orders'])
            ->map(fn ($name) => Permission::create(['name' => $name, 'display_name' => $name]));

        $role = Role::create(['name' => 'Cashier', 'display_name' => 'Cashier']);
        $role->permissions()->attach($permissions->pluck('id'));

        $this->user = User::factory()->create();
        $this->user->roles()->attach($role->id);

        $this->branch = Branch::create(['name' => 'Retail Store A', 'is_active' => true]);

        $this->product = Product::create([
            'name' => 'T-Shirt Classic',
            'slug' => 't-shirt-classic',
            'has_variations' => false,
            'selling_price' => 25.00,
            'tax' => 0,
            'status' => 'active',
        ]);

        $this->inventory = Inventory::create([
            'branch_id' => $this->branch->id,
            'product_id' => $this->product->id,
            'quantity' => 20,
        ]);
    }

    public function test_can_open_cash_drawer(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->postJson('/api/cash-drawer/open', [
            'branch_id' => $this->branch->id,
            'opening_amount' => 100,
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('status', 'open');
        $response->assertJsonPath('opening_amount', '100.00');

        $this->assertDatabaseHas('cash_drawer_sessions', [
            'branch_id' => $this->branch->id,
            'status' => 'open',
        ]);
    }

    public function test_cannot_open_second_session_for_same_branch(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/cash-drawer/open', ['branch_id' => $this->branch->id, 'opening_amount' => 100]);
        $response = $this->postJson('/api/cash-drawer/open', ['branch_id' => $this->branch->id, 'opening_amount' => 50]);

        $response->assertStatus(422);
    }

    public function test_current_returns_404_when_no_open_session(): void
    {
        Sanctum::actingAs($this->user);

        $response = $this->getJson("/api/cash-drawer/current?branch_id={$this->branch->id}");
        $response->assertStatus(404);
    }

    public function test_can_record_cash_in_and_cash_out(): void
    {
        Sanctum::actingAs($this->user);

        $session = $this->openSession(100);

        $this->postJson('/api/cash-drawer/cash-in', [
            'cash_drawer_session_id' => $session['id'],
            'amount' => 50,
            'notes' => 'Change fund top-up',
        ])->assertStatus(201);

        $this->postJson('/api/cash-drawer/cash-out', [
            'cash_drawer_session_id' => $session['id'],
            'amount' => 20,
            'notes' => 'Petty cash',
        ])->assertStatus(201);

        $current = $this->getJson("/api/cash-drawer/current?branch_id={$this->branch->id}");
        // 100 opening + 50 in - 20 out = 130
        $this->assertEquals(130.0, $current->json('current_balance'));
    }

    public function test_cannot_record_transaction_on_closed_session(): void
    {
        Sanctum::actingAs($this->user);

        $session = $this->openSession(100);

        $this->postJson('/api/cash-drawer/close', [
            'cash_drawer_session_id' => $session['id'],
            'closing_amount' => 100,
        ])->assertStatus(200);

        $response = $this->postJson('/api/cash-drawer/cash-in', [
            'cash_drawer_session_id' => $session['id'],
            'amount' => 10,
        ]);

        $response->assertStatus(422);
    }

    public function test_close_computes_shortage_and_surplus(): void
    {
        Sanctum::actingAs($this->user);

        // Shortage: expected 100, actually counted 90
        $shortSession = $this->openSession(100);
        $shortResponse = $this->postJson('/api/cash-drawer/close', [
            'cash_drawer_session_id' => $shortSession['id'],
            'closing_amount' => 90,
        ]);
        $shortResponse->assertStatus(200);
        $this->assertEquals(-10.0, (float) $shortResponse->json('difference'));

        // Surplus: expected 100, actually counted 110
        $surplusSession = $this->openSession(100);
        $surplusResponse = $this->postJson('/api/cash-drawer/close', [
            'cash_drawer_session_id' => $surplusSession['id'],
            'closing_amount' => 110,
        ]);
        $surplusResponse->assertStatus(200);
        $this->assertEquals(10.0, (float) $surplusResponse->json('difference'));
    }

    public function test_cash_checkout_sale_is_logged_and_reflected_in_report(): void
    {
        Sanctum::actingAs($this->user);

        $session = $this->openSession(100);

        $response = $this->postJson('/api/pos/checkout', [
            'branch_id' => $this->branch->id,
            'payment_method' => 'cash',
            'subtotal' => 50,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 50,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 2,
                    'unit_price' => 25,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_price' => 50,
                ],
            ],
        ]);

        $response->assertStatus(201);

        $this->assertDatabaseHas('cash_transactions', [
            'cash_drawer_session_id' => $session['id'],
            'type' => 'sale',
            'amount' => 50,
        ]);

        $report = $this->getJson("/api/cash-drawer/sessions/{$session['id']}/report");
        $report->assertStatus(200);
        $this->assertEquals(50.0, (float) $report->json('total_sales'));
        // 100 opening + 50 cash sale = 150 expected
        $this->assertEquals(150.0, (float) $report->json('expected_amount'));
    }

    public function test_cash_refund_is_logged_against_open_session(): void
    {
        Sanctum::actingAs($this->user);

        $session = $this->openSession(100);

        $checkout = $this->postJson('/api/pos/checkout', [
            'branch_id' => $this->branch->id,
            'payment_method' => 'cash',
            'subtotal' => 25,
            'discount_amount' => 0,
            'tax_amount' => 0,
            'total_amount' => 25,
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'quantity' => 1,
                    'unit_price' => 25,
                    'discount_amount' => 0,
                    'tax_amount' => 0,
                    'total_price' => 25,
                ],
            ],
        ]);

        $saleId = $checkout->json('sale_id');

        $this->postJson("/api/orders/{$saleId}/refund", ['reason' => 'Not satisfied'])->assertStatus(201);

        $this->assertDatabaseHas('cash_transactions', [
            'cash_drawer_session_id' => $session['id'],
            'type' => 'refund',
            'amount' => 25,
        ]);

        $report = $this->getJson("/api/cash-drawer/sessions/{$session['id']}/report");
        // 100 opening + 25 sale - 25 refund = 100
        $this->assertEquals(100.0, (float) $report->json('expected_amount'));
    }

    public function test_cashier_report_includes_transaction_list(): void
    {
        Sanctum::actingAs($this->user);

        $session = $this->openSession(100);
        $this->postJson('/api/cash-drawer/cash-in', [
            'cash_drawer_session_id' => $session['id'],
            'amount' => 30,
        ])->assertStatus(201);

        $response = $this->getJson("/api/cash-drawer/sessions/{$session['id']}/cashier-report");

        $response->assertStatus(200);
        $response->assertJsonPath('cashier.id', $this->user->id);
        $response->assertJsonCount(1, 'transactions');
    }

    public function test_cash_drawer_routes_require_permission(): void
    {
        $unprivilegedUser = User::factory()->create();
        Sanctum::actingAs($unprivilegedUser);

        $response = $this->postJson('/api/cash-drawer/open', [
            'branch_id' => $this->branch->id,
            'opening_amount' => 100,
        ]);

        $response->assertStatus(403);
    }

    public function test_payment_summary_groups_by_method(): void
    {
        Sanctum::actingAs($this->user);

        Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
            'order_number' => 'ORD-2026-1',
            'subtotal' => 100,
            'total_amount' => 100,
            'payment_method' => 'cash',
        ]);

        Sale::create([
            'branch_id' => $this->branch->id,
            'user_id' => $this->user->id,
            'status' => 'completed',
            'order_number' => 'ORD-2026-2',
            'subtotal' => 200,
            'total_amount' => 200,
            'payment_method' => 'card',
        ]);

        $response = $this->getJson('/api/orders/payment-summary');

        $response->assertStatus(200);
        $this->assertEquals(300.0, (float) $response->json('grand_total'));
        $this->assertEquals(2, $response->json('order_count'));
    }

    private function openSession(float $openingAmount): array
    {
        $response = $this->postJson('/api/cash-drawer/open', [
            'branch_id' => $this->branch->id,
            'opening_amount' => $openingAmount,
        ]);

        return $response->json();
    }
}
