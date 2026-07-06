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
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->foreignId('product_id')->nullable()->after('inventory_id')
                  ->constrained('products')->nullOnDelete();

            $table->foreignId('product_variation_id')->nullable()->after('product_id')
                  ->constrained('product_variations')->nullOnDelete();

            $table->foreignId('branch_id')->nullable()->after('product_variation_id')
                  ->constrained('branches')->nullOnDelete();

            // Links a movement back to whatever caused it (e.g. purchase_order / sale / manual)
            $table->string('reference_type')->nullable()->after('reason');
            $table->unsignedBigInteger('reference_id')->nullable()->after('reference_type');

            $table->string('notes')->nullable()->after('reference_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_adjustments', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['product_variation_id']);
            $table->dropForeign(['branch_id']);
            $table->dropColumn([
                'product_id',
                'product_variation_id',
                'branch_id',
                'reference_type',
                'reference_id',
                'notes',
            ]);
        });
    }
};
