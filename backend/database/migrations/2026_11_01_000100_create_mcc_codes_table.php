<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mcc_codes', function (Blueprint $table) {
            $table->char('code', 4)->primary();
            $table->string('title', 120);
            $table->string('category', 40);
            $table->boolean('is_blocked')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['category', 'is_active']);
            $table->index('is_blocked');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mcc_codes');
    }
};
