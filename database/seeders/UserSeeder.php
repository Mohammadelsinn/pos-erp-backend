<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            [
                'name'  => 'Admin User',
                'email' => 'admin@pos-erp.test',
                'role'  => 'admin',
            ],
            [
                'name'  => 'Manager User',
                'email' => 'manager@pos-erp.test',
                'role'  => 'manager',
            ],
            [
                'name'  => 'Cashier User',
                'email' => 'cashier@pos-erp.test',
                'role'  => 'cashier',
            ],
            [
                'name'  => 'Accountant User',
                'email' => 'accountant@pos-erp.test',
                'role'  => 'accountant',
            ],
        ];

        foreach ($users as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name'      => $data['name'],
                    'password'  => Hash::make('password'),
                    'is_active' => true,
                ]
            );

            $role = Role::where('name', $data['role'])->first();

            if ($role) {
                $user->roles()->syncWithoutDetaching([$role->id]);
            }
        }
    }
}
