<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10);
            $table->string('name', 120);
            $table->string('type', 20);
            $table->string('owner_type', 20)->default('platform');
            $table->unsignedBigInteger('owner_id')->default(0);
            $table->char('currency', 3)->default('IDR');
            $table->timestamps();

            $table->unique(['code', 'owner_type', 'owner_id', 'currency'], 'uniq_ledger_account');
            $table->index(['owner_type', 'owner_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ledger_accounts');
    }
};
