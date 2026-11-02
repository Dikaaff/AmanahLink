<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('receipts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->restrictOnDelete();
            $table->string('file_path', 255);
            $table->json('ocr_payload')->nullable();
            $table->decimal('confidence', 3, 2)->nullable();
            $table->string('status', 30)->default('uploaded');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->string('rejection_reason', 500)->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('transaction_id');
        });

        DB::statement('ALTER TABLE receipts ADD CONSTRAINT chk_receipts_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))');
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
    }
};
