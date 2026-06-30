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
        Schema::create('inventory_adjustments', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('inventory_id')
                  ->constrained('inventories')
                  ->cascadeOnDelete();
                  
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->cascadeOnDelete();
                  
            $table->string('type'); // 'increment', 'decrement', 'set'
            $table->integer('quantity'); // The delta or set amount
            $table->string('reason')->nullable(); // e.g. "Stock Audit", "Damaged Item"
            
            $table->timestamp('created_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_adjustments');
    }
};
