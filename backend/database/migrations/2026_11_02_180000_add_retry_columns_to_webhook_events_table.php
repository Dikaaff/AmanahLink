<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('webhook_events', function (Blueprint $table) {
            $table->timestamp('next_attempt_at')->nullable()->after('last_error');
            $table->timestamp('dead_lettered_at')->nullable()->after('next_attempt_at');

            $table->index(['status', 'next_attempt_at'], 'webhook_events_status_next_attempt_index');
        });
    }

    public function down(): void
    {
        Schema::table('webhook_events', function (Blueprint $table) {
            $table->dropIndex('webhook_events_status_next_attempt_index');
            $table->dropColumn(['next_attempt_at', 'dead_lettered_at']);
        });
    }
};
