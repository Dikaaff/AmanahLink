<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchants', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->char('mcc', 4);
            $table->string('mid', 64)->unique();
            $table->string('status', 20)->default('pending');
            $table->string('city', 80)->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['mcc', 'status']);
            $table->index('status');
            $table->foreign('mcc')->references('code')->on('mcc_codes')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchants');
    }
};
