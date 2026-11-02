<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ledger_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('transactions')->restrictOnDelete();
            $table->foreignId('account_id')->constrained('ledger_accounts')->restrictOnDelete();
            $table->string('direction', 6);
            $table->decimal('amount', 15, 2);
            $table->decimal('balance_after', 15, 2);
            $table->timestamp('created_at')->useCurrent();

            $table->index(['transaction_id', 'direction']);
            $table->index(['account_id', 'id']);
        });

        DB::statement('ALTER TABLE ledger_entries ADD CONSTRAINT chk_ledger_entries_amount_positive CHECK (amount > 0)');

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_ledger_entries_no_update
            BEFORE UPDATE ON ledger_entries
            FOR EACH ROW
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_entries are immutable: update is forbidden'
        SQL);

        DB::unprepared(<<<'SQL'
            CREATE TRIGGER trg_ledger_entries_no_delete
            BEFORE DELETE ON ledger_entries
            FOR EACH ROW
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ledger_entries are immutable: delete is forbidden'
        SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER IF EXISTS trg_ledger_entries_no_update');
        DB::unprepared('DROP TRIGGER IF EXISTS trg_ledger_entries_no_delete');

        Schema::dropIfExists('ledger_entries');
    }
};
