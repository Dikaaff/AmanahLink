<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountCode;
use App\Enums\LedgerDirection;
use App\Exceptions\UnbalancedLedgerException;
use App\Models\LedgerAccount;
use App\Models\LedgerEntry;
use App\Models\Transaction;
use App\Support\Money;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;

final class LedgerService
{
    /**
     * Post a balanced set of ledger lines for a transaction.
     *
     * Each line: ['account' => AccountCode, 'direction' => LedgerDirection,
     * 'amount' => string|int|Money, 'campaign_id' => ?int].
     *
     * Must be called inside an existing database transaction; the caller owns
     * the commit/rollback boundary together with the business mutation.
     *
     * @param  list<array{account: AccountCode, direction: LedgerDirection, amount: string|int|Money, campaign_id?: int|null}>  $lines
     * @return Collection<int, LedgerEntry>
     */
    public function post(Transaction $transaction, array $lines): Collection
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('LedgerService::post() must run inside a database transaction.');
        }

        if ($lines === []) {
            throw new InvalidArgumentException('A ledger posting cannot be empty.');
        }

        $prepared = $this->prepare($lines);
        $this->assertBalanced($prepared);

        $accountsByKey = [];
        foreach ($prepared as $index => $line) {
            $key = $line['account']->value.':'.($line['campaign_id'] ?? 0);

            if (! isset($accountsByKey[$key])) {
                $accountsByKey[$key] = $this->resolveAccount($line['account'], $line['campaign_id']);
            }

            $prepared[$index]['account_id'] = $accountsByKey[$key]->id;
        }

        $accountIds = array_values(array_unique(array_column($prepared, 'account_id')));
        sort($accountIds);

        $locked = LedgerAccount::query()
            ->whereIn('id', $accountIds)
            ->orderBy('id')
            ->lockForUpdate()
            ->get()
            ->keyBy('id');

        $running = [];
        foreach ($locked as $id => $account) {
            $running[$id] = $this->currentBalance($account);
        }

        $rows = [];
        $now = now();

        foreach ($prepared as $line) {
            /** @var LedgerAccount $account */
            $account = $locked[$line['account_id']];

            $running[$account->id] = $line['direction'] === $account->normalBalance()
                ? $running[$account->id]->plus($line['amount'])
                : $running[$account->id]->minus($line['amount']);

            $rows[] = [
                'transaction_id' => $transaction->id,
                'account_id' => $account->id,
                'direction' => $line['direction']->value,
                'amount' => $line['amount']->toDecimalString(),
                'balance_after' => $running[$account->id]->toDecimalString(),
                'created_at' => $now,
            ];
        }

        DB::table('ledger_entries')->insert($rows);

        return LedgerEntry::query()
            ->where('transaction_id', $transaction->id)
            ->orderBy('id')
            ->get();
    }

    public function balanceOf(AccountCode $code, ?int $campaignId = null): Money
    {
        $account = $this->findAccount($code, $campaignId);

        return $account === null ? Money::zero() : $this->currentBalance($account);
    }

    /**
     * @param  list<array{account: AccountCode, direction: LedgerDirection, amount: string|int|Money, campaign_id?: int|null}>  $lines
     * @return list<array{account: AccountCode, direction: LedgerDirection, amount: Money, campaign_id: ?int}>
     */
    private function prepare(array $lines): array
    {
        $prepared = [];

        foreach ($lines as $line) {
            $amount = Money::of($line['amount']);

            if (! $amount->isPositive()) {
                throw new InvalidArgumentException('Ledger amounts must be greater than zero.');
            }

            $prepared[] = [
                'account' => $line['account'],
                'direction' => $line['direction'],
                'amount' => $amount,
                'campaign_id' => $line['campaign_id'] ?? null,
            ];
        }

        return $prepared;
    }

    /**
     * @param  list<array{account: AccountCode, direction: LedgerDirection, amount: Money, campaign_id: ?int}>  $lines
     */
    private function assertBalanced(array $lines): void
    {
        $debits = Money::zero();
        $credits = Money::zero();

        foreach ($lines as $line) {
            if ($line['direction'] === LedgerDirection::Debit) {
                $debits = $debits->plus($line['amount']);
            } else {
                $credits = $credits->plus($line['amount']);
            }
        }

        if (! $debits->equals($credits)) {
            throw new UnbalancedLedgerException(
                "Ledger is unbalanced: debits {$debits->toDecimalString()} vs credits {$credits->toDecimalString()}."
            );
        }
    }

    private function resolveAccount(AccountCode $code, ?int $campaignId): LedgerAccount
    {
        if ($code->isCampaignScoped() && $campaignId === null) {
            throw new InvalidArgumentException("Account {$code->value} requires a campaign id.");
        }

        $attributes = [
            'code' => $code->value,
            'owner_type' => $code->isCampaignScoped() ? LedgerAccount::OWNER_CAMPAIGN : LedgerAccount::OWNER_PLATFORM,
            'owner_id' => $code->isCampaignScoped() ? $campaignId : 0,
            'currency' => Money::CURRENCY,
        ];

        try {
            return LedgerAccount::firstOrCreate($attributes, [
                'name' => $code->defaultName(),
                'type' => $code->accountType(),
            ]);
        } catch (UniqueConstraintViolationException) {
            return LedgerAccount::query()->where($attributes)->firstOrFail();
        }
    }

    private function findAccount(AccountCode $code, ?int $campaignId): ?LedgerAccount
    {
        return LedgerAccount::query()
            ->where('code', $code->value)
            ->where('owner_type', $code->isCampaignScoped() ? LedgerAccount::OWNER_CAMPAIGN : LedgerAccount::OWNER_PLATFORM)
            ->where('owner_id', $code->isCampaignScoped() ? $campaignId : 0)
            ->where('currency', Money::CURRENCY)
            ->first();
    }

    private function currentBalance(LedgerAccount $account): Money
    {
        $sums = DB::table('ledger_entries')
            ->selectRaw("CAST(COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount ELSE 0 END), 0) AS CHAR) AS debits")
            ->selectRaw("CAST(COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount ELSE 0 END), 0) AS CHAR) AS credits")
            ->where('account_id', $account->id)
            ->first();

        $debits = Money::of((string) $sums->debits);
        $credits = Money::of((string) $sums->credits);

        return $account->normalBalance() === LedgerDirection::Debit
            ? $debits->minus($credits)
            : $credits->minus($debits);
    }
}
