<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->restrictOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('donation_id')->nullable()->constrained('donations')->restrictOnDelete();
            $table->foreignId('merchant_id')->nullable()->constrained('merchants')->nullOnDelete();
            $table->string('type', 30);
            $table->decimal('amount', 15, 2);
            $table->char('mcc_used', 4)->nullable();
            $table->string('status', 30)->default('requested');
            $table->string('reference_id', 64)->nullable()->unique();
            $table->string('idempotency_key', 150)->nullable()->unique();
            $table->timestamps();

            $table->index(['campaign_id', 'status']);
            $table->index(['type', 'status']);
            $table->index(['campaign_id', 'created_at']);
            $table->foreign('mcc_used')->references('code')->on('mcc_codes')->restrictOnDelete();
        });

        DB::statement('ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_positive CHECK (amount > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
