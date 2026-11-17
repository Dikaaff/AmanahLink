<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\AccountCode;
use App\Enums\MerchantStatus;
use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Models\Campaign;
use App\Models\DisbursementLimit;
use App\Models\Donation;
use App\Models\Merchant;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use App\Notifications\DisputeWrittenOff;
use App\Services\DonationSettlementService;
use App\Services\LedgerService;
use App\Services\SpendingHoldService;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * D-034: a missing or rejected receipt pauses spending for that campaign only.
 * The hold is a product policy, not a network block, and it must never stop
 * donations or touch money that already moved.
 */
final class SpendingHoldApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
    }

    private function fundedCampaign(string $amount = '100000'): Campaign
    {
        $campaign = Campaign::factory()->active()->create();
        $donation = Donation::factory()->create([
            'campaign_id' => $campaign->id,
            'amount' => $amount,
        ]);

        app(DonationSettlementService::class)->settle($donation->payment_ref);

        return $campaign->refresh();
    }

    private function limit(Campaign $campaign): DisbursementLimit
    {
        return DisbursementLimit::create([
            'campaign_id' => $campaign->id,
            'daily_limit' => '100000',
            'monthly_limit' => '1000000',
            'used_today' => '0.00',
            'used_this_month' => '0.00',
            'daily_window' => now()->toDateString(),
            'monthly_window' => now()->format('Y-m'),
            'expires_at' => now()->addMonth(),
        ]);
    }

    private function merchant(): Merchant
    {
        return Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-SPENDING-HOLD',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);
    }

    private function rejectedDisbursement(Campaign $campaign, ?User $reviewer = null): Transaction
    {
        $transaction = Transaction::factory()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => TransactionType::Disbursement,
            'amount' => '20000.00',
            'status' => TransactionStatus::Disputed,
            'settled_at' => now()->subDay(),
        ]);

        Receipt::factory()->create([
            'transaction_id' => $transaction->id,
            'status' => ReceiptStatus::Rejected,
            'rejection_reason' => 'Nota tidak sesuai transaksi.',
            'reviewed_by' => ($reviewer ?? User::factory()->verifier()->create())->id,
            'reviewed_at' => now(),
        ]);

        return $transaction;
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function pay(Campaign $campaign, Merchant $merchant, string $key = 'hold-1', array $overrides = []): TestResponse
    {
        Sanctum::actingAs($campaign->campaigner);

        return $this->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/disbursements', array_merge([
                'campaign_id' => $campaign->id,
                'merchant_id' => $merchant->id,
                'amount' => '30000',
            ], $overrides));
    }

    public function test_a_rejected_receipt_holds_spending_and_explains_why(): void
    {
        $campaign = $this->fundedCampaign();
        $transaction = $this->rejectedDisbursement($campaign);

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson("/api/v1/campaigns/{$campaign->id}/spending-hold")
            ->assertOk()
            ->assertJsonPath('data.held', true)
            ->assertJsonPath('data.code', 'receipt_rejected')
            ->assertJsonPath('data.reference_id', $transaction->reference_id)
            ->assertJsonPath('data.due_at', null);

        $message = $this->getJson("/api/v1/campaigns/{$campaign->id}/spending-hold")
            ->json('data.message');

        $this->assertStringContainsString('Nota tidak sesuai transaksi.', $message);
    }

    public function test_eligibility_check_returns_spending_held_instead_of_a_generic_error(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();
        $this->rejectedDisbursement($campaign);

        Sanctum::actingAs($campaign->campaigner);

        $this->postJson('/api/v1/disbursements/simulate', [
            'campaign_id' => $campaign->id,
            'merchant_id' => $merchant->id,
            'amount' => '30000',
        ])
            ->assertOk()
            ->assertJsonPath('data.allowed', false)
            ->assertJsonPath('data.code', 'SPENDING_HELD')
            ->assertJsonPath('data.details.hold_code', 'receipt_rejected');
    }

    public function test_spending_is_refused_while_the_hold_is_active_and_the_balance_does_not_move(): void
    {
        $campaign = $this->fundedCampaign();
        $this->limit($campaign);
        $merchant = $this->merchant();
        $this->rejectedDisbursement($campaign);

        $this->pay($campaign, $merchant)
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'SPENDING_HELD');

        $this->assertSame(
            '98000.00',
            app(LedgerService::class)->balanceOf(AccountCode::CampaignRestricted, $campaign->id)->toDecimalString(),
        );
        $this->assertSame(
            1,
            Transaction::query()
                ->where('campaign_id', $campaign->id)
                ->where('type', TransactionType::Disbursement->value)
                ->count(),
        );
    }

    public function test_the_public_campaign_page_only_says_spending_is_under_review(): void
    {
        $campaign = $this->fundedCampaign();
        $transaction = $this->rejectedDisbursement($campaign);

        $this->getJson("/api/v1/campaigns/{$campaign->slug}")
            ->assertOk()
            ->assertJsonPath('data.spending_held', true)
            ->assertJsonMissingPath('data.spending_hold_reason')
            ->assertJsonMissingPath('data.merchant');

        $this->assertNotNull($transaction->reference_id);
    }

    public function test_a_receipt_missing_past_the_deadline_holds_spending(): void
    {
        $campaign = $this->fundedCampaign();

        $overdue = Transaction::factory()->settled()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => TransactionType::Disbursement,
            'amount' => '20000.00',
            'settled_at' => now()->subDays(SpendingHoldService::RECEIPT_DUE_DAYS + 1),
        ]);

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson("/api/v1/campaigns/{$campaign->id}/spending-hold")
            ->assertOk()
            ->assertJsonPath('data.held', true)
            ->assertJsonPath('data.code', 'receipt_overdue')
            ->assertJsonPath('data.reference_id', $overdue->reference_id);
    }

    public function test_another_campaign_keeps_spending_while_one_is_held(): void
    {
        $heldCampaign = $this->fundedCampaign();
        $this->limit($heldCampaign);
        $this->rejectedDisbursement($heldCampaign);

        $healthyCampaign = $this->fundedCampaign();
        $this->limit($healthyCampaign);
        $merchant = $this->merchant();

        Sanctum::actingAs($heldCampaign->campaigner);

        $this->pay($healthyCampaign, $merchant, 'hold-2')->assertCreated();

        $this->assertSame(
            '68000.00',
            $healthyCampaign->refresh()->current_amount,
        );
    }

    public function test_the_nota_badge_count_is_scoped_to_the_campaigner(): void
    {
        $campaign = $this->fundedCampaign();

        Transaction::factory()->settled()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => TransactionType::Disbursement,
            'settled_at' => now()->subDay(),
        ]);

        Transaction::factory()->settled()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => TransactionType::Disbursement,
            'settled_at' => now()->subDays(SpendingHoldService::RECEIPT_DUE_DAYS + 1),
        ]);

        Transaction::factory()->settled()->create([
            'campaign_id' => Campaign::factory()->active()->create()->id,
            'type' => TransactionType::Disbursement,
        ]);

        Sanctum::actingAs($campaign->campaigner);

        $this->getJson('/api/v1/receipts/pending-count')
            ->assertOk()
            ->assertJsonPath('data.pending', 2)
            ->assertJsonPath('data.overdue', 1);
    }

    public function test_write_off_closes_the_dispute_suspends_the_merchant_and_releases_the_hold(): void
    {
        $campaign = $this->fundedCampaign();
        $merchant = $this->merchant();

        $transaction = Transaction::factory()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'merchant_id' => $merchant->id,
            'type' => TransactionType::Disbursement,
            'amount' => '20000.00',
            'status' => TransactionStatus::Disputed,
            'settled_at' => now()->subDay(),
        ]);

        Receipt::factory()->create([
            'transaction_id' => $transaction->id,
            'status' => ReceiptStatus::Rejected,
            'rejection_reason' => 'Nota palsu.',
            'reviewed_by' => User::factory()->verifier()->create()->id,
            'reviewed_at' => now(),
        ]);

        $this->artisan('amanahlink:write-off-dispute', [
            'reference' => $transaction->reference_id,
            'reason' => 'Merchant menolak refund.',
        ])->assertSuccessful();

        $this->assertSame(TransactionStatus::Reconciled, $transaction->refresh()->status);
        $this->assertSame(MerchantStatus::Suspended, $merchant->refresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'disbursement.written_off']);
        $this->assertDatabaseHas('notifications', [
            'notifiable_id' => $campaign->user_id,
            'type' => DisputeWrittenOff::class,
        ]);

        $this->assertNull(app(SpendingHoldService::class)->reasonFor($campaign->refresh()));
    }

    public function test_write_off_refuses_a_payment_that_is_not_disputed(): void
    {
        $campaign = $this->fundedCampaign();

        $transaction = Transaction::factory()->settled()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => TransactionType::Disbursement,
        ]);

        $this->artisan('amanahlink:write-off-dispute', [
            'reference' => $transaction->reference_id,
            'reason' => 'Salah jalur.',
        ])->assertExitCode(1);

        $this->assertSame(TransactionStatus::Settled, $transaction->refresh()->status);
    }
}
