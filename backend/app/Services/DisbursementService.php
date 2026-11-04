<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountCode;
use App\Enums\LedgerDirection;
use App\Enums\MerchantStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Exceptions\CampaignNotActiveException;
use App\Exceptions\InsufficientFundsException;
use App\Exceptions\LimitExceededException;
use App\Exceptions\LimitExpiredException;
use App\Exceptions\MccNotAllowedException;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\IdempotencyKey;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Purpose-bound spending. Campaign money may only leave to a verified merchant
 * whose MCC is on the campaign allowlist, within the campaign's daily and
 * monthly limits, and never beyond the ledger balance.
 *
 * Lock order is fixed (campaign -> limit) so two concurrent payouts can never
 * deadlock each other; the loser either waits and re-reads the fresh counters
 * or fails with INSUFFICIENT_FUNDS / LIMIT_EXCEEDED.
 */
final class DisbursementService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly CampaignBalanceService $balances,
        private readonly IdempotencyService $idempotency,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array{transaction: Transaction, replayed: bool}
     */
    public function pay(User $actor, int $campaignId, int $merchantId, Money $amount, string $idempotencyKey): array
    {
        if (! $amount->isPositive()) {
            throw new InsufficientFundsException;
        }

        /** @var array{0: Transaction, 1: bool, 2: IdempotencyKey} $result */
        $result = DB::transaction(function () use ($actor, $campaignId, $merchantId, $amount, $idempotencyKey): array {
            $campaign = Campaign::query()->whereKey($campaignId)->lockForUpdate()->firstOrFail();

            if (! $campaign->allowsDisbursement()) {
                throw new CampaignNotActiveException('Kampanye tidak dapat mencairkan dana saat ini.');
            }

            $merchant = Merchant::query()->findOrFail($merchantId);
            $this->assertMerchantAllowed($campaign, $merchant);

            $acquisition = $this->idempotency->acquire(
                'disbursement:user:'.$actor->getKey(),
                $idempotencyKey,
                [
                    'campaign_id' => $campaign->getKey(),
                    'merchant_id' => $merchant->getKey(),
                    'amount' => $amount->toDecimalString(),
                ],
            );

            if ($acquisition['replayed']) {
                $body = $acquisition['body'] ?? [];

                return [
                    Transaction::query()->findOrFail($body['transaction_id']),
                    true,
                    $acquisition['record'],
                ];
            }

            /** @var DisbursementLimit $limit */
            $limit = DisbursementLimit::query()
                ->where('campaign_id', $campaign->getKey())
                ->lockForUpdate()
                ->first();

            if ($limit === null) {
                throw new LimitExpiredException('Limit pencairan kampanye belum diatur.');
            }

            if ($limit->isExpired()) {
                throw new LimitExpiredException('Limit pencairan kampanye sudah kedaluwarsa.');
            }

            $this->rollWindows($limit);

            $available = $this->balances->expected($campaign);

            if ($amount->isGreaterThan($available)) {
                throw new InsufficientFundsException;
            }

            $remainingToday = Money::of($limit->daily_limit)->minus(Money::of($limit->used_today));

            if ($amount->isGreaterThan($remainingToday)) {
                throw new LimitExceededException('daily', $remainingToday);
            }

            $remainingMonth = Money::of($limit->monthly_limit)->minus(Money::of($limit->used_this_month));

            if ($amount->isGreaterThan($remainingMonth)) {
                throw new LimitExceededException('monthly', $remainingMonth);
            }

            $transaction = Transaction::create([
                'campaign_id' => $campaign->getKey(),
                'user_id' => $actor->getKey(),
                'merchant_id' => $merchant->getKey(),
                'type' => TransactionType::Disbursement,
                'amount' => $amount->toDecimalString(),
                'mcc_used' => $merchant->mcc,
                'status' => TransactionStatus::Captured,
                'reference_id' => 'DIS-'.Str::ulid(),
                'idempotency_key' => 'disbursement:user:'.$actor->getKey().':'.$idempotencyKey,
            ]);

            $this->ledger->post($transaction, [
                [
                    'account' => AccountCode::CampaignRestricted,
                    'direction' => LedgerDirection::Debit,
                    'amount' => $amount,
                    'campaign_id' => $campaign->getKey(),
                ],
                [
                    'account' => AccountCode::MerchantClearing,
                    'direction' => LedgerDirection::Credit,
                    'amount' => $amount,
                ],
            ]);

            $limit->forceFill([
                'used_today' => Money::of($limit->used_today)->plus($amount)->toDecimalString(),
                'used_this_month' => Money::of($limit->used_this_month)->plus($amount)->toDecimalString(),
            ])->save();

            $this->balances->sync($campaign);
            $this->balances->assertConsistent($campaign);

            $this->audit->record('disbursement.captured', $transaction, null, [
                'campaign_id' => $campaign->getKey(),
                'merchant_id' => $merchant->getKey(),
                'merchant_name' => $merchant->name,
                'mcc' => $merchant->mcc,
                'amount' => $amount->toDecimalString(),
                'campaign_balance_after' => $campaign->current_amount,
            ], $actor);

            return [$transaction, false, $acquisition['record']];
        });

        [$transaction, $replayed, $record] = $result;

        if (! $replayed) {
            DB::transaction(fn () => $this->idempotency->complete($record, 201, [
                'transaction_id' => $transaction->getKey(),
            ]));
        }

        return ['transaction' => $transaction, 'replayed' => $replayed];
    }

    /**
     * Read-only authorization preview for the L17 scan simulation. It mirrors
     * pay() without locking, writing, or resetting the limit windows.
     *
     * @return array<string, mixed>
     */
    public function preview(Campaign $campaign, Merchant $merchant, Money $amount): array
    {
        if (! $amount->isPositive()) {
            throw new InsufficientFundsException;
        }

        if (! $campaign->allowsDisbursement()) {
            throw new CampaignNotActiveException('Kampanye tidak dapat mencairkan dana saat ini.');
        }

        $this->assertMerchantAllowed($campaign, $merchant);

        $limit = DisbursementLimit::query()
            ->where('campaign_id', $campaign->getKey())
            ->first();

        if ($limit === null) {
            throw new LimitExpiredException('Limit pencairan kampanye belum diatur.');
        }

        if ($limit->isExpired()) {
            throw new LimitExpiredException('Limit pencairan kampanye sudah kedaluwarsa.');
        }

        $usedToday = $limit->daily_window?->toDateString() === now()->toDateString()
            ? Money::of($limit->used_today)
            : Money::zero();
        $usedMonth = $limit->monthly_window === now()->format('Y-m')
            ? Money::of($limit->used_this_month)
            : Money::zero();

        $available = $this->balances->expected($campaign);

        if ($amount->isGreaterThan($available)) {
            throw new InsufficientFundsException;
        }

        $remainingToday = Money::of($limit->daily_limit)->minus($usedToday);

        if ($amount->isGreaterThan($remainingToday)) {
            throw new LimitExceededException('daily', $remainingToday);
        }

        $remainingMonth = Money::of($limit->monthly_limit)->minus($usedMonth);

        if ($amount->isGreaterThan($remainingMonth)) {
            throw new LimitExceededException('monthly', $remainingMonth);
        }

        return [
            'mcc' => $merchant->mcc,
            'allowed_mcc' => $campaign->allowed_mcc_array ?? [],
            'ledger_balance' => $available->toDecimalString(),
            'remaining_today' => $remainingToday->toDecimalString(),
            'remaining_month' => $remainingMonth->toDecimalString(),
            'limit_expires_at' => $limit->expires_at?->toIso8601String(),
        ];
    }

    private function assertMerchantAllowed(Campaign $campaign, Merchant $merchant): void
    {
        if ($merchant->status !== MerchantStatus::Verified) {
            throw new MccNotAllowedException('Merchant belum terverifikasi sehingga tidak dapat menerima dana.');
        }

        $allowed = $campaign->allowed_mcc_array ?? [];

        if (! in_array($merchant->mcc, $allowed, true)) {
            throw new MccNotAllowedException('Kategori merchant tidak termasuk daftar yang diizinkan kampanye ini.');
        }

        $mcc = $merchant->mccCode()->first();

        if ($mcc === null || ! $mcc->is_active || $mcc->is_blocked) {
            throw new MccNotAllowedException('Kategori merchant sedang diblokir oleh platform.');
        }
    }

    private function rollWindows(DisbursementLimit $limit): void
    {
        $today = now()->toDateString();

        if ($limit->daily_window?->toDateString() !== $today) {
            $limit->used_today = Money::zero()->toDecimalString();
            $limit->daily_window = $today;
        }

        $month = now()->format('Y-m');

        if ($limit->monthly_window !== $month) {
            $limit->used_this_month = Money::zero()->toDecimalString();
            $limit->monthly_window = $month;
        }
    }
}
