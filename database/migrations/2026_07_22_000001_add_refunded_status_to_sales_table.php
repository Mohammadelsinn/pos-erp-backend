<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Widens the 'status' enum defined in create_sales_table to add 'refunded'.
        // Laravel 12's native (doctrine-free) column change support handles this per-driver
        // (MySQL/MariaDB MODIFY, SQLite table rebuild), so no raw SQL is needed here.
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['draft', 'held', 'completed', 'cancelled', 'refunded'])
                  ->default('draft')
                  ->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('status', ['draft', 'held', 'completed', 'cancelled'])
                  ->default('draft')
                  ->change();
        });
    }
};
