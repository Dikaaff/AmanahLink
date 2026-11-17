<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            // Path lokal (`/campaigns/...`) atau URL absolut. Diisi sistem /
            // seeder; belum ada endpoint unggah dari penggalang.
            $table->string('cover_image_url', 2048)->nullable()->after('description');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn('cover_image_url');
        });
    }
};
