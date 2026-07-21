<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->enum('source', ['pos', 'online'])->default('pos')->after('payment_method');
            $table->enum('payment_status', ['pending', 'paid', 'refunded', 'failed'])->default('paid')->after('source');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn(['source', 'payment_status']);
        });
    }
};
