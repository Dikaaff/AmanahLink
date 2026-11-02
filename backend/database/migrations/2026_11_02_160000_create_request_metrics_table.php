<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('request_metrics', function (Blueprint $table) {
            $table->id();
            $table->string('route', 100);
            $table->unsignedSmallInteger('status_code');
            $table->unsignedInteger('duration_ms');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['route', 'created_at']);
            $table->index(['route', 'duration_ms']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('request_metrics');
    }
};
