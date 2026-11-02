<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\Campaign;
use App\Models\Donation;
use App\Models\Transaction;
use App\Models\User;
use App\Models\WebhookEvent;
use App\Services\LedgerService;
use App\Enums\AccountCode;
use App\Support\Money;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class PaymentWebhookApiTest extends TestCase
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
    private function deliver(array $payload, ?string $secret = self::SECRET): \Illuminate\Testing\TestResponse
    {
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
                'HTTP_X_CALLBACK_SIGNATURE' => hash_hmac('sha256', $body, $secret ?? ''),
            ],
            $body,
        );
    }

    public function test_a_bad_signature_is_rejected(): void
    {
        $this->deliver([
            'external_id' => 'evt-1',
            'event' => 'payment.settled',
            'payment_ref' => 'PAY-X',
        ], 'wrong-secret')
            ->assertUnauthorized()
            ->assertJsonPath('error.code', 'INVALID_SIGNATURE');

        $this->assertSame(0, WebhookEvent::query()->count());
    }

    public function test_a_settled_callback_credits_the_campaign_exactly_once(): void
    {
        $campaign = Campaign::factory()->active()->create();
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => 100000,
        ]);

        $payload = [
            'external_id' => 'evt-settled-1',
            'event' => 'payment.settled',
            'payment_ref' => $donation->payment_ref,
        ];

        $this->deliver($payload)->assertOk()->assertJsonPath('data.status', 'processed');

        $this->assertDatabaseHas('donations', [
            'id' => $donation->id,
            'status' => 'settled',
        ]);
        $this->assertDatabaseHas('campaigns', [
            'id' => $campaign->id,
            'current_amount' => '98000.00',
        ]);
        $this->assertSame(
            '98000.00',
            app(LedgerService::class)
                ->balanceOf(AccountCode::CampaignRestricted, $campaign->id)
                ->toDecimalString(),
        );

        $countBefore = Transaction::query()->count();
        $this->deliver($payload)->assertOk()->assertJsonPath('data.status', 'processed');
        $this->assertSame($countBefore, Transaction::query()->count());
        $this->assertSame(
            '98000.00',
            app(LedgerService::class)
                ->balanceOf(AccountCode::CampaignRestricted, $campaign->id)
                ->toDecimalString(),
        );
    }

    public function test_an_unknown_payment_reference_is_marked_failed(): void
    {
        $this->deliver([
            'external_id' => 'evt-unknown',
            'event' => 'payment.settled',
            'payment_ref' => 'PAY-TIDAK-ADA',
        ])->assertNotFound();

        $this->assertDatabaseHas('webhook_events', [
            'external_id' => 'evt-unknown',
            'status' => 'failed',
        ]);
    }

    public function test_a_non_settlement_event_is_stored_but_ignored(): void
    {
        $this->deliver([
            'external_id' => 'evt-pending',
            'event' => 'payment.pending',
            'payment_ref' => 'PAY-ANY',
        ])->assertOk()->assertJsonPath('data.status', 'processed');

        $this->assertSame(0, Donation::query()->where('status', 'settled')->count());
    }

    public function test_a_malformed_body_is_a_bad_request(): void
    {
        $body = '{"broken"';
        $this->call(
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
        )
            ->assertStatus(400)
            ->assertJsonPath('error.code', 'BAD_REQUEST');
    }
}
