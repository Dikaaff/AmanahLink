<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReceiptReviewApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
        Storage::fake('local');
    }

    /**
     * @return array{0: Receipt, 1: Transaction}
     */
    private function needsReviewReceipt(?Campaign $campaign = null): array
    {
        $campaign ??= Campaign::factory()->active()->create();

        $transaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => 'disbursement',
            'amount' => '50000.00',
            'status' => TransactionStatus::ReceiptPending,
        ]);

        $receipt = Receipt::factory()->needsReview()->create([
            'transaction_id' => $transaction->id,
        ]);

        return [$receipt, $transaction];
    }

    public function test_the_queue_lists_receipts_that_need_review(): void
    {
        [$receipt] = $this->needsReviewReceipt();

        Receipt::factory()->create();

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->getJson('/api/v1/receipts?status=needs_review')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $receipt->id)
            ->assertJsonPath('data.0.status', 'needs_review');
    }

    public function test_a_campaigner_sees_only_receipts_from_own_campaigns(): void
    {
        $campaign = Campaign::factory()->active()->create();
        [$own] = $this->needsReviewReceipt($campaign);
        [$foreign] = $this->needsReviewReceipt();

        Sanctum::actingAs($campaign->campaigner);

        $response = $this->getJson('/api/v1/receipts')
            ->assertOk()
            ->assertJsonPath('data.0.transaction.campaign.id', $campaign->id)
            ->assertJsonPath('data.0.transaction.status', 'receipt_pending');

        $ids = collect($response->json('data'))->pluck('id')->all();

        $this->assertContains($own->id, $ids);
        $this->assertNotContains($foreign->id, $ids);
    }

    public function test_a_donor_cannot_access_the_receipt_list(): void
    {
        Sanctum::actingAs(User::factory()->donor()->create());

        $this->getJson('/api/v1/receipts')->assertForbidden();
    }

    public function test_a_verifier_approves_a_receipt_and_reconciles_the_disbursement(): void
    {
        [$receipt, $transaction] = $this->needsReviewReceipt();

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", ['decision' => 'approve'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertSame(ReceiptStatus::Approved, $receipt->refresh()->status);
        $this->assertNotNull($receipt->reviewed_by);
        $this->assertSame(TransactionStatus::Reconciled, $transaction->refresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'receipt.approved']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'disbursement.reconciled']);
    }

    public function test_rejecting_requires_a_reason_and_marks_the_transaction_disputed(): void
    {
        [$receipt, $transaction] = $this->needsReviewReceipt();

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", ['decision' => 'reject'])
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR');

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", [
            'decision' => 'reject',
            'rejection_reason' => 'Nominal pada nota tidak sesuai transaksi.',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.rejection_reason', 'Nominal pada nota tidak sesuai transaksi.');

        $this->assertSame(TransactionStatus::Disputed, $transaction->refresh()->status);
        $this->assertDatabaseHas('audit_logs', ['action' => 'receipt.rejected']);
    }

    public function test_a_campaigner_cannot_approve_a_receipt(): void
    {
        [$receipt] = $this->needsReviewReceipt();

        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", ['decision' => 'approve'])
            ->assertForbidden();

        $this->assertSame(ReceiptStatus::NeedsReview, $receipt->refresh()->status);
    }

    public function test_a_receipt_can_only_be_reviewed_once(): void
    {
        [$receipt] = $this->needsReviewReceipt();

        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", ['decision' => 'approve'])
            ->assertOk();

        $this->postJson("/api/v1/receipts/{$receipt->id}/review", ['decision' => 'reject', 'rejection_reason' => 'Terlambat.'])
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');

        $this->assertSame(1, AuditLog::query()->where('action', 'receipt.approved')->count());
    }
}
