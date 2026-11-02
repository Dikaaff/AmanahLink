<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->timestamp('frozen_at')->nullable()->after('funded_at');
            $table->string('freeze_reason', 500)->nullable()->after('frozen_at');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn(['frozen_at', 'freeze_reason']);
        });
    }
};
