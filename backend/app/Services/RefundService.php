<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\AccountCode;
use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use App\Enums\LedgerDirection;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Exceptions\InvalidStateTransitionException;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\Transaction;
use App\Models\User;
use App\Support\Money;
use Brick\Math\BigInteger;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Closes a campaign and returns whatever is left in its restricted account to
 * the donors who funded it.
 *
 * Refunds are proportional to each donor's net contribution (donation minus
 * the platform fee already earned). The remainder is split in whole cents with
 * the largest-remainder method, so the sum of the refunds always equals the
 * ledger balance exactly: no cent is created or lost (BR-05).
 */
final class RefundService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly CampaignBalanceService $balances,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array{campaign: Campaign, donor_count: int, total: string}
     */
    public function closeAndRefund(Campaign $campaign, User $actor): array
    {
        return DB::transaction(function () use ($campaign, $actor): array {
            /** @var Campaign $locked */
            $locked = Campaign::query()->whereKey($campaign->getKey())->lockForUpdate()->firstOrFail();

            $previousStatus = $locked->status;

            if (! $previousStatus->canTransitionTo(CampaignStatus::Closed)) {
                throw new InvalidStateTransitionException($previousStatus, CampaignStatus::Closed);
            }

            $locked->forceFill([
                'status' => CampaignStatus::Closed,
                'closed_at' => now(),
            ])->save();

            $this->audit->record('campaign.closed', $locked, [
                'status' => $previousStatus->value,
            ], [
                'status' => CampaignStatus::Closed->value,
            ], $actor);

            $balance = $this->balances->expected($locked);

            /** @var Collection<int, Donation> $donations */
            $donations = $locked->donations()->settled()->lockForUpdate()->get();

            $shares = $this->allocate($donations, $balance->toMinorUnits());

            $total = Money::zero();
            $donorCount = 0;

            foreach ($donations as $donation) {
                $cents = $shares[$donation->getKey()] ?? 0;

                if ($cents <= 0) {
                    continue;
                }

                $amount = Money::fromMinorUnits($cents);

                $refund = Transaction::create([
                    'campaign_id' => $locked->getKey(),
                    'user_id' => $donation->donor_id,
                    'donation_id' => $donation->getKey(),
                    'type' => TransactionType::Refund,
                    'amount' => $amount->toDecimalString(),
                    'status' => TransactionStatus::Captured,
                    'reference_id' => 'RFD-'.Str::ulid(),
                    'idempotency_key' => 'refund:donation:'.$donation->getKey(),
                ]);

                $this->ledger->post($refund, [
                    [
                        'account' => AccountCode::CampaignRestricted,
                        'direction' => LedgerDirection::Debit,
                        'amount' => $amount,
                        'campaign_id' => $locked->getKey(),
                    ],
                    [
                        'account' => AccountCode::RefundPayable,
                        'direction' => LedgerDirection::Credit,
                        'amount' => $amount,
                    ],
                ]);

                $donation->forceFill(['status' => DonationStatus::Refunded])->save();

                $total = $total->plus($amount);
                $donorCount++;

                $this->audit->record('refund.issued', $refund, null, [
                    'donation_id' => $donation->getKey(),
                    'donor_id' => $donation->donor_id,
                    'amount' => $amount->toDecimalString(),
                ], $actor);
            }

            if ($total->isPositive()) {
                $payout = Transaction::create([
                    'campaign_id' => $locked->getKey(),
                    'user_id' => $actor->getKey(),
                    'type' => TransactionType::Refund,
                    'amount' => $total->toDecimalString(),
                    'status' => TransactionStatus::Captured,
                    'reference_id' => 'RFP-'.Str::ulid(),
                    'idempotency_key' => 'refund:payout:'.$locked->getKey(),
                ]);

                $this->ledger->post($payout, [
                    [
                        'account' => AccountCode::RefundPayable,
                        'direction' => LedgerDirection::Debit,
                        'amount' => $total,
                    ],
                    [
                        'account' => AccountCode::PlatformCash,
                        'direction' => LedgerDirection::Credit,
                        'amount' => $total,
                    ],
                ]);
            }

            $locked->forceFill([
                'status' => CampaignStatus::Refunded,
                'refunded_at' => now(),
            ])->save();

            $this->balances->sync($locked);
            $this->balances->assertConsistent($locked);

            $this->audit->record('campaign.refunded', $locked, null, [
                'donor_count' => $donorCount,
                'total' => $total->toDecimalString(),
                'campaign_current_amount' => $locked->current_amount,
            ], $actor);

            return [
                'campaign' => $locked->refresh(),
                'donor_count' => $donorCount,
                'total' => $total->toDecimalString(),
            ];
        });
    }

    /**
     * Split the remaining cents proportionally to net contributions using the
     * largest-remainder method (Hamilton). BigInteger keeps the intermediate
     * products exact for campaigns in the hundreds of millions of rupiah.
     *
     * @param  Collection<int, Donation>  $donations
     * @return array<int, int> donation id => cents
     */
    private function allocate(Collection $donations, int $remainingCents): array
    {
        $weights = [];
        $totalWeight = 0;

        foreach ($donations as $donation) {
            $gross = Money::of($donation->amount);
            $fee = $gross->percentOf((string) config('amanahlink.platform_fee_percent'));
            $weight = $gross->minus($fee)->toMinorUnits();

            $weights[$donation->getKey()] = $weight;
            $totalWeight += $weight;
        }

        if ($weights === [] || $remainingCents <= 0) {
            return array_fill_keys(array_keys($weights), 0);
        }

        if ($totalWeight <= 0) {
            return $this->splitEqually(array_keys($weights), $remainingCents);
        }

        $shares = [];
        $remainders = [];
        $allocated = 0;
        $divisor = BigInteger::of($totalWeight);

        foreach ($weights as $id => $weight) {
            if ($weight <= 0) {
                $shares[$id] = 0;
                $remainders[$id] = 0;

                continue;
            }

            $product = BigInteger::of($remainingCents)->multipliedBy($weight);

            $shares[$id] = $product->quotient($divisor)->toInt();
            $remainders[$id] = $product->remainder($divisor)->toInt();
            $allocated += $shares[$id];
        }

        $leftover = $remainingCents - $allocated;

        if ($leftover > 0) {
            $order = array_keys($remainders);

            usort($order, static function (int $a, int $b) use ($remainders): int {
                return ($remainders[$b] <=> $remainders[$a]) ?: ($a <=> $b);
            });

            foreach (array_slice($order, 0, min($leftover, count($order))) as $id) {
                $shares[$id]++;
            }
        }

        return $shares;
    }

    /**
     * @param  list<int>  $ids
     * @return array<int, int>
     */
    private function splitEqually(array $ids, int $remainingCents): array
    {
        $base = intdiv($remainingCents, count($ids));
        $leftover = $remainingCents - ($base * count($ids));
        $shares = [];

        foreach (array_values($ids) as $index => $id) {
            $shares[$id] = $base + ($index < $leftover ? 1 : 0);
        }

        return $shares;
    }
}
