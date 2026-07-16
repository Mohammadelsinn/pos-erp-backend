<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ProductImageController;
use App\Http\Controllers\ProductVariationController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\PosController;
use App\Http\Controllers\PurchaseOrderController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public auth routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);

    // User management — requires manage_users permission
    Route::middleware('permission:manage_users')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::patch('users/{user}/toggle-status', [UserController::class, 'toggleStatus']);
        Route::post('users/{user}/roles', [UserController::class, 'assignRole']);
        Route::delete('users/{user}/roles/{role}', [UserController::class, 'removeRole']);
    });

    // Role management — requires manage_roles permission
    Route::middleware('permission:manage_roles')->group(function () {
        Route::apiResource('roles', RoleController::class);
    });

    // Permission management — requires manage_permissions permission
    Route::middleware('permission:manage_permissions')->group(function () {
        Route::apiResource('permissions', PermissionController::class);
    });

    // Settings & config — requires manage_settings permission
    Route::middleware('permission:manage_settings')->group(function () {
        Route::get('settings', [SettingController::class, 'index']);
        Route::put('settings', [SettingController::class, 'update']);
        Route::get('config', [ConfigController::class, 'index']);
    });

    // Branch management — requires manage_branches permission
    Route::middleware('permission:manage_branches')->group(function () {
        Route::apiResource('branches', BranchController::class);
        Route::patch('branches/{branch}/toggle-status', [BranchController::class, 'toggleStatus']);
    });

    // Product catalog management — requires manage_products permission
    Route::middleware('permission:manage_products')->group(function () {
        Route::post('products/upload-image', [ProductController::class, 'uploadImage']);
        Route::post('products/bulk-delete', [ProductController::class, 'bulkDelete']);
        Route::post('products/bulk-status', [ProductController::class, 'bulkStatus']);
        Route::patch('products/{product}/toggle-status', [ProductController::class, 'toggleStatus']);
        Route::apiResource('products', ProductController::class);
        
        Route::apiResource('categories', CategoryController::class);
        Route::apiResource('brands', BrandController::class);

        // Product Images routes (from HEAD)
        Route::post('products/{product}/images', [ProductImageController::class, 'store']);
        Route::delete('products/{product}/images/{image}', [ProductImageController::class, 'destroy']);
        Route::patch('products/{product}/images/{image}/set-primary', [ProductImageController::class, 'setPrimary']);

        // Product Variations routes
        Route::get('products/{product}/variations', [ProductVariationController::class, 'index']);
        Route::post('products/{product}/variations', [ProductVariationController::class, 'store']);
        Route::get('products/{product}/variations/{variation}', [ProductVariationController::class, 'show']);
        Route::put('products/{product}/variations/{variation}', [ProductVariationController::class, 'update']);
        Route::delete('products/{product}/variations/{variation}', [ProductVariationController::class, 'destroy']);
        Route::patch('products/{product}/variations/{variation}/toggle-status', [ProductVariationController::class, 'toggleStatus']);
    });

    // Inventory management — requires manage_inventory permission
    Route::middleware('permission:manage_inventory')->group(function () {
        Route::get('inventory', [InventoryController::class, 'index']);
        Route::get('inventory/low-stock', [InventoryController::class, 'lowStock']);
        Route::get('inventory/history', [InventoryController::class, 'allHistory']);
        Route::get('stock-movements', [InventoryController::class, 'allHistory']);
        Route::post('inventory/adjust', [InventoryController::class, 'adjust']);
        Route::get('inventory/{inventory}/history', [InventoryController::class, 'history']);
        Route::get('inventory/{inventory}/movements', [InventoryController::class, 'history']);
        Route::post('inventory/{inventory}/adjust', [InventoryController::class, 'adjustById']);
        Route::post('inventory/{inventory}/damaged', [InventoryController::class, 'markDamaged']);
        Route::post('inventory/{inventory}/lost', [InventoryController::class, 'markLost']);
        Route::get('inventory/{inventory}', [InventoryController::class, 'show']);
    });

    // Supplier management — requires manage_suppliers permission
    Route::middleware('permission:manage_suppliers')->group(function () {
        Route::patch('suppliers/{supplier}/toggle-status', [SupplierController::class, 'toggleStatus']);
        Route::apiResource('suppliers', SupplierController::class);
    });

    // Purchase order management — requires manage_purchases permission
    Route::middleware('permission:manage_purchases')->group(function () {
        Route::patch('purchase-orders/{purchase_order}/status', [PurchaseOrderController::class, 'updateStatus']);
        Route::post('purchase-orders/{purchase_order}/receive', [PurchaseOrderController::class, 'receive']);
        Route::apiResource('purchase-orders', PurchaseOrderController::class);
    });

    // POS — requires manage_pos permission
    Route::middleware('permission:manage_pos')->group(function () {
        Route::get('pos/products', [PosController::class, 'products']);
        Route::post('pos/checkout', [PosController::class, 'checkout']);

        // Draft sale (cart) management
        Route::post('pos/sales', [PosController::class, 'store']);
        Route::post('pos/sales/{id}/items', [PosController::class, 'addItem']);
        Route::put('pos/sales/{id}/items/{itemId}', [PosController::class, 'updateItem']);
        Route::delete('pos/sales/{id}/items/{itemId}', [PosController::class, 'removeItem']);
        Route::put('pos/sales/{id}/items/{itemId}/discount', [PosController::class, 'updateItemDiscount']);
        Route::put('pos/sales/{id}/discount', [PosController::class, 'updateDiscount']);
        Route::get('pos/sales/{id}/totals', [PosController::class, 'totals']);
    });
});
