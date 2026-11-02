<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('disbursement_limits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->restrictOnDelete();
            $table->decimal('daily_limit', 15, 2);
            $table->decimal('monthly_limit', 15, 2);
            $table->decimal('used_today', 15, 2)->default(0);
            $table->decimal('used_this_month', 15, 2)->default(0);
            $table->date('daily_window');
            $table->char('monthly_window', 7);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['campaign_id', 'expires_at']);
        });

        DB::statement('ALTER TABLE disbursement_limits ADD CONSTRAINT chk_disbursement_limits_positive CHECK (daily_limit > 0 AND monthly_limit > 0)');
        DB::statement('ALTER TABLE disbursement_limits ADD CONSTRAINT chk_disbursement_limits_usage CHECK (used_today >= 0 AND used_this_month >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('disbursement_limits');
    }
};
