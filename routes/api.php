<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BranchController;
use App\Http\Controllers\ConfigController;
use App\Http\Controllers\PermissionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
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
});
