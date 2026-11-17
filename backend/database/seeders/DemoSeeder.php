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
                'cover_image_url' => '/campaigns/operasi-ibu-sari.jpg',
                'target_amount' => 10_000_000,
                'current_amount' => 0,
                'allowed_mcc_array' => ['5912', '8062'],
                'status' => CampaignStatus::Active,
                'deadline_at' => now()->addDays(30),
                'reviewed_at' => now(),
            ],
        );
        $campaign->update(['cover_image_url' => '/campaigns/operasi-ibu-sari.jpg']);

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

        // Additional public campaigns make the feed representative: different
        // causes, deadlines, and progress, each backed by settled donations so
        // the ledger stays balanced.
        foreach ([
            [
                'slug' => 'seragam-dan-buku-untuk-anak-kampung',
                'title' => 'Seragam dan Buku untuk Anak Kampung',
                'description' => 'Setiap anak berhak mulai sekolah dengan seragam yang layak dan buku yang lengkap. Dana hanya dipakai di toko buku dan sekolah yang terdaftar.',
                'cover_image_url' => '/campaigns/seragam-anak-kampung.jpg',
                'target_amount' => 12_000_000,
                'deadline_days' => 24,
                'donations' => ['PAY-DEMO-1001' => '3750000.00'],
            ],
            [
                'slug' => 'dapur-umum-untuk-korban-banjir',
                'title' => 'Dapur Umum untuk Korban Banjir',
                'description' => 'Dapur umum menyediakan makanan hangat setiap hari untuk keluarga yang rumahnya terendam. Belanja bahan makanan dibatasi ke minimarket dan pasar terdaftar.',
                'cover_image_url' => '/campaigns/dapur-umum-banjir.jpg',
                'target_amount' => 25_000_000,
                'deadline_days' => 45,
                'donations' => ['PAY-DEMO-1002' => '11400000.00'],
            ],
            [
                'slug' => 'beasiswa-anak-nelayan',
                'title' => 'Beasiswa Anak Nelayan',
                'description' => 'Biaya sekolah dan perlengkapan belajar untuk anak-anak nelayan yang terpaksa berhenti sekolah. Pencairan hanya ke sekolah dan toko buku terverifikasi.',
                'cover_image_url' => '/campaigns/beasiswa-anak-nelayan.jpg',
                'target_amount' => 18_000_000,
                'deadline_days' => 60,
                'donations' => ['PAY-DEMO-1003' => '6200000.00'],
            ],
        ] as $demo) {
            $extra = Campaign::firstOrCreate(
                ['slug' => $demo['slug']],
                [
                    'user_id' => $campaigner->id,
                    'title' => $demo['title'],
                    'description' => $demo['description'],
                    'cover_image_url' => $demo['cover_image_url'],
                    'target_amount' => $demo['target_amount'],
                    'current_amount' => 0,
                    'allowed_mcc_array' => ['8211', '5411'],
                    'status' => CampaignStatus::Active,
                    'deadline_at' => now()->addDays($demo['deadline_days']),
                    'reviewed_at' => now(),
                ],
            );
            $extra->update(['cover_image_url' => $demo['cover_image_url']]);

            foreach ($demo['donations'] as $reference => $amount) {
                Donation::firstOrCreate(
                    ['payment_ref' => $reference],
                    [
                        'campaign_id' => $extra->id,
                        'donor_id' => $donor->id,
                        'amount' => $amount,
                        'status' => DonationStatus::Initiated,
                        'expires_at' => now()->addDay(),
                    ],
                );

                $settlements->settle($reference);
            }
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
