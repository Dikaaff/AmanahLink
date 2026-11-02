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
use App\Support\Money;
use Illuminate\Support\Facades\DB;

final class DonationSettlementService
{
    public function __construct(
        private readonly LedgerService $ledger,
        private readonly CampaignBalanceService $balances,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Apply a confirmed payment to the ledger exactly once.
     *
     * Replays are safe: a donation already settled returns without writing
     * new ledger entries. Money was really received from the provider, so a
     * campaign that was frozen between pay-in and webhook is still credited;
     * the funds simply stay locked until the campaign is unfrozen.
     */
    public function settle(string $paymentRef): Donation
    {
        return DB::transaction(function () use ($paymentRef): Donation {
            /** @var Donation $donation */
            $donation = Donation::query()
                ->where('payment_ref', $paymentRef)
                ->lockForUpdate()
                ->firstOrFail();

            if ($donation->status === DonationStatus::Settled) {
                return $donation;
            }

            if (! $donation->status->canTransitionTo(DonationStatus::Settled)) {
                throw new InvalidStateTransitionException($donation->status, DonationStatus::Settled);
            }

            /** @var Campaign $campaign */
            $campaign = Campaign::query()
                ->whereKey($donation->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $amount = Money::of($donation->amount);
            $fee = $amount->percentOf((string) config('amanahlink.platform_fee_percent'));
            $net = $amount->minus($fee);

            $before = [
                'donation_status' => $donation->status->value,
                'campaign_current_amount' => $campaign->current_amount,
            ];

            $this->postSettlementEntries($donation, $campaign, $amount, $fee);

            $donation->forceFill([
                'status' => DonationStatus::Settled,
                'settled_at' => now(),
            ])->save();

            $campaign->forceFill([
                'current_amount' => Money::of($campaign->current_amount)->plus($net)->toDecimalString(),
            ])->save();

            $this->markFundedIfTargetReached($campaign);

            $this->balances->assertConsistent($campaign);

            $this->audit->record('donation.settled', $donation, $before, [
                'donation_status' => DonationStatus::Settled->value,
                'amount' => $amount->toDecimalString(),
                'platform_fee' => $fee->toDecimalString(),
                'net_amount' => $net->toDecimalString(),
                'campaign_current_amount' => $campaign->current_amount,
            ]);

            return $donation->fresh();
        });
    }

    private function postSettlementEntries(Donation $donation, Campaign $campaign, Money $amount, Money $fee): void
    {
        $settlement = Transaction::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donation->donor_id,
            'donation_id' => $donation->id,
            'type' => TransactionType::DonationSettlement,
            'amount' => $amount->toDecimalString(),
            'status' => TransactionStatus::Captured,
            'reference_id' => $donation->payment_ref,
            'idempotency_key' => 'settlement:'.$donation->payment_ref,
        ]);

        $this->ledger->post($settlement, [
            [
                'account' => AccountCode::PlatformCash,
                'direction' => LedgerDirection::Debit,
                'amount' => $amount,
            ],
            [
                'account' => AccountCode::CampaignRestricted,
                'direction' => LedgerDirection::Credit,
                'amount' => $amount,
                'campaign_id' => $campaign->id,
            ],
        ]);

        if (! $fee->isPositive()) {
            return;
        }

        $feeTransaction = Transaction::create([
            'campaign_id' => $campaign->id,
            'user_id' => $donation->donor_id,
            'donation_id' => $donation->id,
            'type' => TransactionType::PlatformFee,
            'amount' => $fee->toDecimalString(),
            'status' => TransactionStatus::Captured,
            'reference_id' => substr('FEE-'.$donation->payment_ref, 0, 64),
            'idempotency_key' => 'fee:'.$donation->payment_ref,
        ]);

        $this->ledger->post($feeTransaction, [
            [
                'account' => AccountCode::CampaignRestricted,
                'direction' => LedgerDirection::Debit,
                'amount' => $fee,
                'campaign_id' => $campaign->id,
            ],
            [
                'account' => AccountCode::PlatformFeeRevenue,
                'direction' => LedgerDirection::Credit,
                'amount' => $fee,
            ],
        ]);
    }

    private function markFundedIfTargetReached(Campaign $campaign): void
    {
        if ($campaign->status !== CampaignStatus::Active) {
            return;
        }

        $reached = ! Money::of($campaign->current_amount)->isLessThan(Money::of($campaign->target_amount));

        if (! $reached || ! $campaign->status->canTransitionTo(CampaignStatus::Funded)) {
            return;
        }

        $campaign->forceFill([
            'status' => CampaignStatus::Funded,
            'funded_at' => now(),
        ])->save();

        $this->audit->record('campaign.funded', $campaign, null, [
            'status' => CampaignStatus::Funded->value,
            'current_amount' => $campaign->current_amount,
        ]);
    }
}
