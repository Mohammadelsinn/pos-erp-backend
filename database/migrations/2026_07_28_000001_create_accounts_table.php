<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->string('code')->unique();
            $blueprint->string('name');
            $blueprint->enum('type', ['asset', 'liability', 'equity', 'revenue', 'expense']);
            $blueprint->string('detail_type')->nullable();
            $blueprint->text('description')->nullable();
            $blueprint->decimal('balance', 15, 2)->default(0.00);
            $blueprint->boolean('is_active')->default(true);
            $blueprint->boolean('is_system')->default(false);
            $blueprint->timestamps();
        });

        // Seed default chart of accounts
        $defaultAccounts = [
            // Assets
            ['code' => '1010', 'name' => 'Cash on Hand', 'type' => 'asset', 'detail_type' => 'Cash', 'is_system' => true, 'balance' => 0.00],
            ['code' => '1020', 'name' => 'Cash Drawer Till', 'type' => 'asset', 'detail_type' => 'Cash', 'is_system' => true, 'balance' => 0.00],
            ['code' => '1100', 'name' => 'Accounts Receivable', 'type' => 'asset', 'detail_type' => 'Accounts Receivable', 'is_system' => true, 'balance' => 0.00],
            ['code' => '1200', 'name' => 'Inventory Asset', 'type' => 'asset', 'detail_type' => 'Inventory', 'is_system' => true, 'balance' => 0.00],
            
            // Liabilities
            ['code' => '2000', 'name' => 'Accounts Payable', 'type' => 'liability', 'detail_type' => 'Accounts Payable', 'is_system' => true, 'balance' => 0.00],
            ['code' => '2200', 'name' => 'Sales Tax Payable', 'type' => 'liability', 'detail_type' => 'Sales Tax', 'is_system' => true, 'balance' => 0.00],
            
            // Equity
            ['code' => '3000', 'name' => 'Owner\'s Equity', 'type' => 'equity', 'detail_type' => 'Equity', 'is_system' => true, 'balance' => 0.00],
            ['code' => '3100', 'name' => 'Retained Earnings', 'type' => 'equity', 'detail_type' => 'Retained Earnings', 'is_system' => true, 'balance' => 0.00],
            
            // Revenue
            ['code' => '4000', 'name' => 'Product Sales', 'type' => 'revenue', 'detail_type' => 'Revenue', 'is_system' => true, 'balance' => 0.00],
            
            // Expenses
            ['code' => '5000', 'name' => 'Cost of Goods Sold', 'type' => 'expense', 'detail_type' => 'COGS', 'is_system' => true, 'balance' => 0.00],
            ['code' => '5105', 'name' => 'Rent Expense', 'type' => 'expense', 'detail_type' => 'Expense', 'is_system' => false, 'balance' => 0.00],
            ['code' => '5205', 'name' => 'Utilities Expense', 'type' => 'expense', 'detail_type' => 'Expense', 'is_system' => false, 'balance' => 0.00],
            ['code' => '5305', 'name' => 'Salaries & Wages', 'type' => 'expense', 'detail_type' => 'Expense', 'is_system' => false, 'balance' => 0.00],
        ];

        foreach ($defaultAccounts as $account) {
            $account['created_at'] = now();
            $account['updated_at'] = now();
            DB::table('accounts')->insert($account);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
