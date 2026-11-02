<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->string('title', 150);
            $table->string('slug', 180)->unique();
            $table->text('description');
            $table->decimal('target_amount', 15, 2);
            $table->decimal('current_amount', 15, 2)->default(0);
            $table->json('allowed_mcc_array');
            $table->string('status', 30)->default('draft');
            $table->timestamp('deadline_at');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamp('funded_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'deadline_at']);
            $table->index(['status', 'created_at']);
            $table->index(['user_id', 'status']);
        });

        DB::statement('ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_target_amount_positive CHECK (target_amount > 0)');
        DB::statement('ALTER TABLE campaigns ADD CONSTRAINT chk_campaigns_current_amount_non_negative CHECK (current_amount >= 0)');
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};
