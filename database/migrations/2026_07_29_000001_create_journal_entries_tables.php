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
        Schema::create('journal_entries', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->date('entry_date');
            $blueprint->string('reference')->nullable();
            $blueprint->text('description')->nullable();
            $blueprint->foreignId('user_id')->constrained()->cascadeOnDelete();
            $blueprint->timestamps();
        });

        Schema::create('journal_entry_items', function (Blueprint $blueprint) {
            $blueprint->id();
            $blueprint->foreignId('journal_entry_id')->constrained()->cascadeOnDelete();
            $blueprint->foreignId('account_id')->constrained()->cascadeOnDelete();
            $blueprint->enum('type', ['debit', 'credit']);
            $blueprint->decimal('amount', 15, 2);
            $blueprint->string('memo')->nullable();
            $blueprint->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('journal_entry_items');
        Schema::dropIfExists('journal_entries');
    }
};
