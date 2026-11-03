<?php

namespace Database\Seeders;

use App\Enums\CampaignStatus;
use App\Enums\DonationStatus;
use App\Enums\MerchantStatus;
use App\Enums\UserRole;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\User;
use App\Services\DonationSettlementService;
use Illuminate\Database\Seeder;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        $campaigner = User::firstOrCreate(
            ['email' => 'budi@amanahlink.test'],
            ['name' => 'Budi Santoso', 'role' => UserRole::Campaigner, 'password' => 'password'],
        );
        $campaigner->markEmailAsVerified();

        $donor = User::firstOrCreate(
            ['email' => 'siti@amanahlink.test'],
            ['name' => 'Siti Aminah', 'role' => UserRole::Donor, 'password' => 'password'],
        );
        $donor->markEmailAsVerified();

        $this->merchant('Apotek Sehat Sentosa', '5912', 'MID-DEMO-APOTEK', 'Jakarta');
        $this->merchant('RS Harapan Bunda', '8062', 'MID-DEMO-RSHB', 'Bandung');

        $campaign = Campaign::firstOrCreate(
            ['slug' => 'bantu-biaya-operasi-ibu-sari'],
            [
                'user_id' => $campaigner->id,
                'title' => 'Bantu Biaya Operasi Ibu Sari',
                'description' => 'Dana digunakan hanya untuk obat, rumah sakit, dan praktik dokter yang menangani Ibu Sari.',
                'target_amount' => 10_000_000,
                'current_amount' => 0,
                'allowed_mcc_array' => ['5912', '8062'],
                'status' => CampaignStatus::Active,
                'deadline_at' => now()->addDays(30),
                'reviewed_at' => now(),
            ],
        );

        DisbursementLimit::firstOrCreate(
            ['campaign_id' => $campaign->id],
            [
                'daily_limit' => 5_000_000,
                'monthly_limit' => 50_000_000,
                'daily_window' => now()->toDateString(),
                'monthly_window' => now()->format('Y-m'),
                'expires_at' => now()->addDays(30),
            ],
        );

        $settlements = app(DonationSettlementService::class);

        foreach ([
            ['PAY-DEMO-0001', '500000.00'],
            ['PAY-DEMO-0002', '250000.00'],
        ] as [$reference, $amount]) {
            Donation::firstOrCreate(
                ['payment_ref' => $reference],
                [
                    'campaign_id' => $campaign->id,
                    'donor_id' => $donor->id,
                    'amount' => $amount,
                    'status' => DonationStatus::Initiated,
                    'expires_at' => now()->addDay(),
                ],
            );

            $settlements->settle($reference);
        }
    }

    private function merchant(string $name, string $mcc, string $mid, string $city): void
    {
        Merchant::firstOrCreate(
            ['mid' => $mid],
            [
                'name' => $name,
                'mcc' => $mcc,
                'status' => MerchantStatus::Verified,
                'city' => $city,
                'verified_at' => now(),
            ],
        );
    }
}
