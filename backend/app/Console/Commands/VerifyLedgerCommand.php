<?php

namespace App\Console\Commands;

use App\Support\Money;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class VerifyLedgerCommand extends Command
{
    protected $signature = 'ledger:verify';

    protected $description = 'Verify financial invariants: balanced transactions, captured transactions with entries, and campaign balances that match the ledger';

    public function handle(): int
    {
        $unbalanced = DB::select(<<<'SQL'
            SELECT transaction_id,
                   CAST(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END) AS CHAR) AS debits,
                   CAST(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END) AS CHAR) AS credits
            FROM ledger_entries
            GROUP BY transaction_id
            HAVING SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END)
                   <> SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END)
        SQL);

        $orphaned = DB::select(<<<'SQL'
            SELECT t.id
            FROM transactions t
            LEFT JOIN ledger_entries e ON e.transaction_id = t.id
            WHERE t.status IN ('captured', 'receipt_pending', 'verified', 'reconciled', 'disputed')
              AND e.id IS NULL
        SQL);

        $campaignRows = DB::select(<<<'SQL'
            SELECT c.id,
                   CAST(c.current_amount AS CHAR) AS cached,
                   CAST(
                       COALESCE(SUM(CASE WHEN e.direction = 'credit' THEN e.amount ELSE 0 END), 0)
                       - COALESCE(SUM(CASE WHEN e.direction = 'debit' THEN e.amount ELSE 0 END), 0)
                   AS CHAR) AS ledger_balance
            FROM campaigns c
            LEFT JOIN ledger_accounts a
                ON a.code = '2200' AND a.owner_type = 'campaign' AND a.owner_id = c.id
            LEFT JOIN ledger_entries e ON e.account_id = a.id
            GROUP BY c.id, c.current_amount
        SQL);

        $mismatched = array_values(array_filter(
            $campaignRows,
            fn (object $row) => ! Money::of((string) $row->cached)->equals(Money::of((string) $row->ledger_balance)),
        ));

        $this->line('Transactions inspected: '.DB::table('transactions')->count());
        $this->line('Campaign balances inspected: '.count($campaignRows));

        if ($unbalanced !== []) {
            $this->error(count($unbalanced).' transaction(s) are unbalanced:');
            $this->table(
                ['transaction_id', 'debits', 'credits'],
                array_map(fn (object $row) => (array) $row, $unbalanced),
            );
        }

        if ($orphaned !== []) {
            $this->error(count($orphaned).' captured transaction(s) have no ledger entries:');
            $this->table(['transaction_id'], array_map(fn (object $row) => [$row->id], $orphaned));
        }

        if ($mismatched !== []) {
            $this->error(count($mismatched).' campaign balance(s) disagree with the ledger:');
            $this->table(
                ['campaign_id', 'cached', 'ledger'],
                array_map(fn (object $row) => [$row->id, $row->cached, $row->ledger_balance], $mismatched),
            );
        }

        if ($unbalanced === [] && $orphaned === [] && $mismatched === []) {
            $this->info('All financial invariants hold.');

            return self::SUCCESS;
        }

        return self::FAILURE;
    }
}
