<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AccountCode;
use App\Enums\WebhookStatus;
use App\Models\Campaign;
use App\Models\Donation;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Services\LedgerService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class WebhookRetryApiTest extends TestCase
{
    use RefreshDatabase;

    private const SECRET = 'test-webhook-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config(['amanahlink.payment_webhook_secret' => self::SECRET]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function deliver(array $payload): TestResponse
    {
        $payload += ['timestamp' => now()->toIso8601String()];
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        return $this->call(
            'POST',
            '/api/v1/webhooks/payments/fake',
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
                'HTTP_X_CALLBACK_SIGNATURE' => hash_hmac('sha256', $body, self::SECRET),
            ],
            $body,
        );
    }

    public function test_a_failing_event_backs_off_one_five_thirty_minutes_then_dead_letters(): void
    {
        $this->deliver([
            'external_id' => 'evt-retry-1',
            'event' => 'payment.settled',
            'payment_ref' => 'PAY-TIDAK-ADA',
        ])->assertNotFound();

        $event = WebhookEvent::query()->where('external_id', 'evt-retry-1')->firstOrFail();

        $this->assertSame(WebhookStatus::Failed, $event->status);
        $this->assertSame(1, $event->attempts);
        $this->assertTrue($event->next_attempt_at->between(now()->addSeconds(58), now()->addSeconds(60)));

        $this->travel(61)->seconds();
        Artisan::call('webhooks:retry');

        $event->refresh();
        $this->assertSame(2, $event->attempts);
        $this->assertTrue($event->next_attempt_at->between(now()->addSeconds(298), now()->addSeconds(300)));

        $this->travel(301)->seconds();
        Artisan::call('webhooks:retry');

        $event->refresh();
        $this->assertSame(3, $event->attempts);
        $this->assertTrue($event->next_attempt_at->between(now()->addSeconds(1798), now()->addSeconds(1800)));

        $this->travel(1801)->seconds();
        Artisan::call('webhooks:retry');

        $event->refresh();
        $this->assertSame(WebhookStatus::DeadLetter, $event->status);
        $this->assertSame(4, $event->attempts);
        $this->assertNotNull($event->dead_lettered_at);
        $this->assertNull($event->next_attempt_at);
    }

    public function test_a_due_retry_settles_the_donation_once_the_reference_exists(): void
    {
        $this->deliver([
            'external_id' => 'evt-retry-late',
            'event' => 'payment.settled',
            'payment_ref' => 'PAY-LATE-1',
        ])->assertNotFound();

        $campaign = Campaign::factory()->active()->create();
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'payment_ref' => 'PAY-LATE-1',
            'amount' => 100000,
        ]);

        $this->travel(61)->seconds();
        Artisan::call('webhooks:retry');

        $this->assertDatabaseHas('donations', ['id' => $donation->id, 'status' => 'settled']);
        $this->assertDatabaseHas('webhook_events', [
            'external_id' => 'evt-retry-late',
            'status' => 'processed',
        ]);

        $this->assertSame(
            '98000.00',
            app(LedgerService::class)
                ->balanceOf(AccountCode::CampaignRestricted, $campaign->id)
                ->toDecimalString(),
        );
    }

    public function test_replaying_a_dead_letter_does_not_duplicate_ledger_entries(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => 100000,
        ]);

        $this->deliver([
            'external_id' => 'evt-replay-1',
            'event' => 'payment.settled',
            'payment_ref' => $donation->payment_ref,
        ])->assertOk();

        $event = WebhookEvent::query()->where('external_id', 'evt-replay-1')->firstOrFail();

        Sanctum::actingAs(User::factory()->admin()->create());

        $replayFromDeadLetter = function () use ($event, $campaign, $donation): void {
            $event->forceFill([
                'status' => WebhookStatus::DeadLetter,
                'attempts' => 4,
                'dead_lettered_at' => now(),
                'next_attempt_at' => null,
            ])->save();

            $this->postJson("/api/v1/admin/webhook-events/{$event->id}/replay")
                ->assertOk()
                ->assertJsonPath('data.status', 'processed');

            $event->refresh();
            $this->assertSame(WebhookStatus::Processed, $event->status);
            $this->assertNull($event->dead_lettered_at);
            $this->assertSame(
                '98000.00',
                app(LedgerService::class)
                    ->balanceOf(AccountCode::CampaignRestricted, $campaign->id)
                    ->toDecimalString(),
            );
            $this->assertSame(1, Transaction::query()->where('donation_id', $donation->id)
                ->where('type', 'donation_settlement')
                ->count());
        };

        $replayFromDeadLetter();
        $replayFromDeadLetter();
    }

    public function test_only_admins_can_inspect_and_replay_webhook_events(): void
    {
        $event = WebhookEvent::factory()->create([
            'status' => WebhookStatus::DeadLetter,
            'attempts' => 4,
            'dead_lettered_at' => now(),
        ]);

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->getJson('/api/v1/admin/webhook-events')->assertForbidden();
        $this->postJson("/api/v1/admin/webhook-events/{$event->id}/replay")->assertForbidden();

        $this->assertSame(WebhookStatus::DeadLetter, $event->fresh()->status);
    }

    public function test_the_dead_letter_queue_can_be_filtered_and_processed_events_cannot_be_replayed(): void
    {
        WebhookEvent::factory()->create(['status' => WebhookStatus::DeadLetter, 'attempts' => 4]);
        $processed = WebhookEvent::factory()->create(['status' => WebhookStatus::Processed]);

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/webhook-events?status=dead_letter')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'dead_letter');

        $this->postJson("/api/v1/admin/webhook-events/{$processed->id}/replay")
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');
    }
}
