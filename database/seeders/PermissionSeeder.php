<?php

namespace Database\Seeders;

use App\Models\Permission;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            ['name' => 'manage_users',       'display_name' => 'Manage Users',       'description' => 'Create, update, and delete users'],
            ['name' => 'manage_roles',        'display_name' => 'Manage Roles',        'description' => 'Create, update, and delete roles'],
            ['name' => 'manage_permissions',  'display_name' => 'Manage Permissions',  'description' => 'Create, update, and delete permissions'],
            ['name' => 'view_dashboard',      'display_name' => 'View Dashboard',      'description' => 'Access the main dashboard'],
            ['name' => 'manage_settings',     'display_name' => 'Manage Settings',     'description' => 'Configure system settings'],
            ['name' => 'manage_branches',     'display_name' => 'Manage Branches',     'description' => 'Create, update, and delete branches'],
            ['name' => 'manage_products',     'display_name' => 'Manage Catalog',      'description' => 'Manage products, categories, and brands'],
            ['name' => 'manage_inventory',    'display_name' => 'Manage Inventory',    'description' => 'Manage and adjust stock quantities'],
        ];

        foreach ($permissions as $perm) {
            Permission::firstOrCreate(['name' => $perm['name']], $perm);
        }
    }
}
