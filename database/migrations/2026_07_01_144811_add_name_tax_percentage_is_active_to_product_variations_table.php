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
        Schema::table('product_variations', function (Blueprint $table) {
            $table->string('name')->nullable()->after('product_id');
            $table->decimal('tax_percentage', 5, 2)->default(0.00)->after('selling_price');
            $table->boolean('is_active')->default(true)->after('tax_percentage');
            $table->unique('barcode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_variations', function (Blueprint $table) {
            $table->dropUnique(['barcode']);
            $table->dropColumn(['name', 'tax_percentage', 'is_active']);
        });
    }
};
