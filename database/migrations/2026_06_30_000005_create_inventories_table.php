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
        Schema::create('inventories', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('branch_id')
                  ->constrained('branches')
                  ->cascadeOnDelete();
                  
            $table->foreignId('product_id')
                  ->constrained('products')
                  ->cascadeOnDelete();
                  
            $table->foreignId('product_variation_id')
                  ->nullable()
                  ->constrained('product_variations')
                  ->cascadeOnDelete();
                  
            $table->integer('quantity')->default(0);
            $table->integer('min_stock_level')->default(5);
            
            $table->timestamps();

            // Prevent duplicate entries for same product/variation in a branch
            $table->unique(['branch_id', 'product_id', 'product_variation_id'], 'branch_product_variation_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventories');
    }
};
