<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\CampaignStatus;
use App\Models\Campaign;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

final class CampaignCycleTest extends TestCase
{
    use RefreshDatabase;

    public function test_cycle_expires_campaigns_and_records_an_audit_log(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'deadline_at' => now()->subMinute(),
        ]);

        $this->artisan('amanah:campaign-cycle')
            ->expectsOutputToContain('Expired 1 campaign(s)')
            ->assertExitCode(0);

        $this->assertSame(CampaignStatus::Expired, $campaign->refresh()->status);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign.expired',
            'subject_id' => $campaign->id,
        ]);
    }

    public function test_cycle_refunds_expired_campaigns_after_the_refund_window(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'status' => CampaignStatus::Expired,
            'deadline_at' => now()->subDays(8),
        ]);
        User::factory()->admin()->create();

        $this->artisan('amanah:campaign-cycle')
            ->expectsOutputToContain('refunded 1')
            ->assertExitCode(0);

        $this->assertSame(CampaignStatus::Refunded, $campaign->refresh()->status);
        $this->assertNotNull($campaign->refunded_at);
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'campaign.refunded',
            'subject_id' => $campaign->id,
        ]);
    }

    public function test_cycle_does_not_refund_before_the_refund_window_ends(): void
    {
        $campaign = Campaign::factory()->active()->create([
            'status' => CampaignStatus::Expired,
            'deadline_at' => now()->subDays(2),
        ]);
        User::factory()->admin()->create();

        $this->artisan('amanah:campaign-cycle')->assertExitCode(0);

        $this->assertSame(CampaignStatus::Expired, $campaign->refresh()->status);
    }

    public function test_cycle_prunes_only_request_metrics_older_than_retention_window(): void
    {
        DB::table('request_metrics')->insert([
            [
                'route' => 'old',
                'status_code' => 200,
                'duration_ms' => 10,
                'created_at' => now()->subHours(91),
            ],
            [
                'route' => 'fresh',
                'status_code' => 200,
                'duration_ms' => 10,
                'created_at' => now()->subHours(89),
            ],
        ]);

        $this->artisan('amanah:campaign-cycle')->assertExitCode(0);

        $this->assertDatabaseMissing('request_metrics', ['route' => 'old']);
        $this->assertDatabaseHas('request_metrics', ['route' => 'fresh']);
    }
}
