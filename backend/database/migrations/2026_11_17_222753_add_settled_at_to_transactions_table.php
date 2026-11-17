<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * `captured` means the platform has debited the campaign and owes the
     * merchant. `settled_at` records when the transfer actually reached the
     * merchant, which is a different moment for a real bank rail (T+1). The
     * demo driver settles synchronously, so it fills this column immediately.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->timestamp('settled_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('settled_at');
        });
    }
};
