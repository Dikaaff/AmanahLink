<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('donations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->restrictOnDelete();
            $table->foreignId('donor_id')->constrained('users')->restrictOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('payment_ref', 64)->unique();
            $table->string('status', 20)->default('initiated');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->string('failure_reason', 255)->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'status']);
            $table->index(['donor_id', 'created_at']);
            $table->index('status');
        });

        DB::statement('ALTER TABLE donations ADD CONSTRAINT chk_donations_amount_positive CHECK (amount > 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('donations');
    }
};
