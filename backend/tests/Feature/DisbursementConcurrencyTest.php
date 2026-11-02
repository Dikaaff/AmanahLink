<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\AccountCode;
use App\Enums\MerchantStatus;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Transaction;
use App\Models\User;
use App\Services\DonationSettlementService;
use App\Services\LedgerService;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * NFR-02 proof. Five independent PHP processes hit the same campaign at the
 * same time, each with its own MySQL connection. Only the row locks inside
 * DisbursementService stand between them and an overdraft, so this test would
 * fail loudly if the locks (or the ledger balance check) were removed.
 *
 * No RefreshDatabase here on purpose: a surrounding transaction would be
 * invisible to the child processes.
 */
final class DisbursementConcurrencyTest extends TestCase
{
    private const PAYOUT = '30000';

    private const FUNDED = '100000.00';

    protected function setUp(): void
    {
        parent::setUp();

        Artisan::call('migrate:fresh', ['--force' => true]);
        $this->seed(MccCodeSeeder::class);
    }

    protected function tearDown(): void
    {
        Artisan::call('migrate:fresh', ['--force' => true]);

        parent::tearDown();
    }

    public function test_parallel_payouts_cannot_exceed_the_ledger_balance(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->active()->create(['user_id' => $campaigner->id]);

        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => self::FUNDED,
        ]);

        app(DonationSettlementService::class)->settle($donation->payment_ref);

        DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => '1000000.00',
            'monthly_limit' => '1000000.00',
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addMonth(),
        ]);

        $merchant = Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-CONCURRENCY',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);

        $processes = [];

        for ($attempt = 1; $attempt <= 5; $attempt++) {
            $process = new Process([
                PHP_BINARY,
                'artisan',
                'amanahlink:disburse',
                (string) $campaign->id,
                (string) $merchant->id,
                self::PAYOUT,
                'concurrent-'.$attempt,
                (string) $campaigner->id,
            ], base_path(), [
                'APP_ENV' => 'testing',
                'DB_CONNECTION' => 'mysql',
                'DB_DATABASE' => 'amanahlink_test',
                'CACHE_STORE' => 'array',
                'SESSION_DRIVER' => 'array',
                'QUEUE_CONNECTION' => 'sync',
            ]);

            $process->setTimeout(90);
            $process->start();

            $processes[] = $process;
        }

        foreach ($processes as $process) {
            $process->wait();
        }

        $outputs = array_map(
            static fn (Process $process): string => trim($process->getOutput()),
            $processes,
        );

        $succeeded = array_values(array_filter(
            $outputs,
            static fn (string $output): bool => str_contains($output, '"ok":true'),
        ));

        $failed = array_values(array_filter(
            $outputs,
            static fn (string $output): bool => str_contains($output, '"ok":false'),
        ));

        $this->assertCount(3, $succeeded, 'Hanya 3 dari 5 pencairan yang boleh lolos: '.implode(' | ', $outputs));
        $this->assertCount(2, $failed, 'Sisanya harus ditolak: '.implode(' | ', $outputs));

        foreach ($failed as $output) {
            $this->assertStringContainsString('Saldo kampanye tidak mencukupi', $output);
        }

        $balance = app(LedgerService::class)->balanceOf(AccountCode::CampaignRestricted, $campaign->id);

        $this->assertSame('8000.00', $balance->toDecimalString());
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'current_amount' => '8000.00',
        ]);
        $this->assertSame(3, Transaction::query()->where('type', 'disbursement')->count());
        $this->assertSame(
            '90000.00',
            (string) Transaction::query()->where('type', 'disbursement')->sum('amount'),
        );

        $this->assertSame(0, Artisan::call('ledger:verify'));
    }
}
