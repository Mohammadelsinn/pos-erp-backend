<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $allPermissions = Permission::pluck('id')->toArray();

        $roles = [
            [
                'name'         => 'admin',
                'display_name' => 'Administrator',
                'description'  => 'Full system access',
                'permissions'  => $allPermissions,
            ],
            [
                'name'         => 'manager',
                'display_name' => 'Manager',
                'description'  => 'Manages users and views dashboard',
                'permissions'  => Permission::whereIn('name', ['manage_users', 'view_dashboard', 'manage_settings', 'manage_products'])->pluck('id')->toArray(),
            ],
            [
                'name'         => 'cashier',
                'display_name' => 'Cashier',
                'description'  => 'Accesses POS and dashboard',
                'permissions'  => Permission::whereIn('name', ['view_dashboard'])->pluck('id')->toArray(),
            ],
            [
                'name'         => 'accountant',
                'display_name' => 'Accountant',
                'description'  => 'Manages financial records and views dashboard',
                'permissions'  => Permission::whereIn('name', ['view_dashboard', 'manage_settings'])->pluck('id')->toArray(),
            ],
        ];

        foreach ($roles as $data) {
            $role = Role::firstOrCreate(
                ['name' => $data['name']],
                ['display_name' => $data['display_name'], 'description' => $data['description']]
            );
            $role->permissions()->sync($data['permissions']);
        }
    }
}
