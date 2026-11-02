<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\PaymentGateway;
use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use App\Exceptions\CampaignNotActiveException;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\IdempotencyKey;
use App\Models\User;
use App\Support\Money;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

final class DonationService
{
    public function __construct(
        private readonly PaymentGateway $gateway,
        private readonly IdempotencyService $idempotency,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return array{donation: Donation, payment: array<string, string>, replayed: bool}
     */
    public function initiate(User $donor, int $campaignId, Money $amount, string $idempotencyKey): array
    {
        $this->assertWithinLimits($amount);

        /**
         * @var array{0: Donation, 1: array<string, string>|null, 2: bool, 3: IdempotencyKey} $result
         */
        $result = DB::transaction(function () use ($donor, $campaignId, $amount, $idempotencyKey): array {
            $campaign = Campaign::query()->whereKey($campaignId)->lockForUpdate()->firstOrFail();

            $this->assertAcceptsDonations($campaign);

            $acquisition = $this->idempotency->acquire(
                'donation:user:'.$donor->getKey(),
                $idempotencyKey,
                [
                    'donor_id' => $donor->getKey(),
                    'campaign_id' => $campaign->getKey(),
                    'amount' => $amount->toDecimalString(),
                ],
            );

            if ($acquisition['replayed']) {
                $body = $acquisition['body'] ?? [];
                $donation = Donation::query()->findOrFail($body['donation_id']);

                return [$donation, $body['payment'], true, $acquisition['record']];
            }

            $donation = Donation::create([
                'campaign_id' => $campaign->getKey(),
                'donor_id' => $donor->getKey(),
                'amount' => $amount->toDecimalString(),
                'payment_ref' => 'PAY-'.Str::ulid(),
                'status' => DonationStatus::Initiated,
                'expires_at' => now()->addHours((int) config('amanahlink.payment_expiry_hours', 24)),
            ]);

            $this->audit->record('donation.initiated', $donation, null, [
                'campaign_id' => $campaign->getKey(),
                'amount' => $donation->amount,
                'payment_ref' => $donation->payment_ref,
            ], $donor);

            return [$donation, null, false, $acquisition['record']];
        });

        [$donation, $payment, $replayed, $record] = $result;

        if ($payment === null) {
            $payment = $this->gateway->createPayment($donation)->toArray();

            DB::transaction(fn () => $this->idempotency->complete($record, 201, [
                'donation_id' => $donation->getKey(),
                'payment' => $payment,
            ]));
        }

        return ['donation' => $donation, 'payment' => $payment, 'replayed' => $replayed];
    }

    private function assertAcceptsDonations(Campaign $campaign): void
    {
        if (! $campaign->status->acceptsDonations()) {
            $reason = match ($campaign->status) {
                CampaignStatus::Frozen => 'Kampanye sedang dibekukan.',
                CampaignStatus::Expired => 'Kampanye sudah kedaluwarsa.',
                CampaignStatus::Closed => 'Kampanye sudah ditutup.',
                CampaignStatus::Refunded => 'Dana kampanye sudah dikembalikan.',
                default => 'Kampanye belum aktif atau sedang menunggu review.',
            };

            throw new CampaignNotActiveException($reason);
        }

        if ($campaign->deadline_at->isPast()) {
            throw new CampaignNotActiveException('Tenggat kampanye sudah lewat.');
        }
    }

    private function assertWithinLimits(Money $amount): void
    {
        $min = Money::of((string) config('amanahlink.min_donation'));
        $max = Money::of((string) config('amanahlink.max_donation'));

        if (! $amount->isPositive() || $amount->isLessThan($min)) {
            throw ValidationException::withMessages([
                'amount' => ["Nominal donasi minimal {$min->format()}."],
            ]);
        }

        if ($amount->isGreaterThan($max)) {
            throw ValidationException::withMessages([
                'amount' => ["Nominal donasi maksimal {$max->format()}."],
            ]);
        }
    }
}
