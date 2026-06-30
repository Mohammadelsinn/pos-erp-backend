<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Category;
use App\Models\Inventory;
use App\Models\Permission;
use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Role $role;
    private Branch $branch1;
    private Branch $branch2;
    private Category $category1;
    private Category $category2;
    private Product $product1;
    private Product $product2;

    protected function setUp(): void
    {
        parent::setUp();

        // Setup role & permissions
        $permission = Permission::create([
            'name' => 'manage_products',
            'display_name' => 'Manage Products',
        ]);
        $this->role = Role::create([
            'name' => 'Admin',
            'display_name' => 'Admin',
        ]);
        $this->role->permissions()->attach($permission->id);

        $this->user = User::factory()->create();
        $this->user->roles()->attach($this->role->id);

        // Setup branches
        $this->branch1 = Branch::create([
            'name' => 'Branch One',
            'is_active' => true,
        ]);
        $this->branch2 = Branch::create([
            'name' => 'Branch Two',
            'is_active' => true,
        ]);

        // Setup categories
        $this->category1 = Category::create([
            'name' => 'Electronics',
            'slug' => 'electronics',
        ]);
        $this->category2 = Category::create([
            'name' => 'Apparel',
            'slug' => 'apparel',
        ]);

        // Setup products
        $this->product1 = Product::create([
            'name' => 'iPhone 15',
            'slug' => 'iphone-15',
            'category_id' => $this->category1->id,
            'has_variations' => false,
            'cost_price' => 800,
            'selling_price' => 1000,
            'sku' => 'IPHONE15',
        ]);

        $this->product2 = Product::create([
            'name' => 'Cotton T-Shirt',
            'slug' => 'cotton-t-shirt',
            'category_id' => $this->category2->id,
            'has_variations' => false,
            'cost_price' => 10,
            'selling_price' => 20,
            'sku' => 'TSHIRT',
        ]);

        // Associate inventory (product 1 in branch 1, product 2 in branch 2)
        Inventory::create([
            'branch_id' => $this->branch1->id,
            'product_id' => $this->product1->id,
            'quantity' => 10,
        ]);

        Inventory::create([
            'branch_id' => $this->branch2->id,
            'product_id' => $this->product2->id,
            'quantity' => 50,
        ]);
    }

    public function test_can_filter_products_by_branch(): void
    {
        Sanctum::actingAs($this->user);

        // Filter by Branch 1 (should only return iPhone 15)
        $response = $this->getJson('/api/products?branch_id=' . $this->branch1->id);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $this->product1->id);

        // Filter by Branch 2 (should only return Cotton T-Shirt)
        $response2 = $this->getJson('/api/products?branch_id=' . $this->branch2->id);

        $response2->assertStatus(200);
        $response2->assertJsonCount(1, 'data');
        $response2->assertJsonPath('data.0.id', $this->product2->id);
    }

    public function test_can_filter_products_by_category(): void
    {
        Sanctum::actingAs($this->user);

        // Filter by Category 1 (Electronics)
        $response = $this->getJson('/api/products?category_id=' . $this->category1->id);

        $response->assertStatus(200);
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.id', $this->product1->id);

        // Filter by Category 2 (Apparel)
        $response2 = $this->getJson('/api/products?category_id=' . $this->category2->id);

        $response2->assertStatus(200);
        $response2->assertJsonCount(1, 'data');
        $response2->assertJsonPath('data.0.id', $this->product2->id);
    }
}
