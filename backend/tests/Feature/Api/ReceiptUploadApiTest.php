<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Jobs\ProcessReceiptOcr;
use App\Models\Campaign;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReceiptUploadApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
        Storage::fake('local');
        Queue::fake();
    }

    private function capturedTransaction(?Campaign $campaign = null): Transaction
    {
        $campaign ??= Campaign::factory()->active()->create();

        return Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => 'disbursement',
            'amount' => '50000.00',
        ]);
    }

    /**
     * @param  array<string, mixed>  $file
     */
    private function upload(User $actor, Transaction $transaction, ?UploadedFile $file = null): TestResponse
    {
        Sanctum::actingAs($actor);

        return $this->post(
            "/api/v1/disbursements/{$transaction->id}/receipts",
            ['file' => $file ?? UploadedFile::fake()->create('nota.jpg', 100, 'image/jpeg')],
            ['Accept' => 'application/json'],
        );
    }

    public function test_the_owner_uploads_a_receipt_and_the_ocr_job_is_queued(): void
    {
        $transaction = $this->capturedTransaction();

        $this->upload($transaction->campaign->campaigner, $transaction)
            ->assertStatus(202)
            ->assertJsonPath('data.status', 'uploaded')
            ->assertJsonPath('data.transaction_id', $transaction->id);

        $receipt = Receipt::query()->sole();

        $this->assertSame($transaction->id, $receipt->transaction_id);
        $this->assertSame('uploaded', $receipt->status->value);
        Storage::disk('local')->assertExists($receipt->file_path);

        Queue::assertPushed(ProcessReceiptOcr::class, fn (ProcessReceiptOcr $job): bool => $job->receiptId === $receipt->id);

        $this->assertSame('receipt_pending', $transaction->refresh()->status->value);
        $this->assertDatabaseHas('audit_logs', ['action' => 'receipt.uploaded']);
    }

    public function test_an_unsupported_mime_type_is_rejected(): void
    {
        $transaction = $this->capturedTransaction();

        $this->upload(
            $transaction->campaign->campaigner,
            $transaction,
            UploadedFile::fake()->create('nota.pdf', 100, 'application/pdf'),
        )
            ->assertUnprocessable()
            ->assertJsonPath('error.code', 'VALIDATION_ERROR')
            ->assertJsonStructure(['error' => ['details' => ['fields' => ['file']]]]);

        $this->assertSame(0, Receipt::query()->count());
    }

    public function test_a_stranger_cannot_upload_a_receipt(): void
    {
        $transaction = $this->capturedTransaction();

        $this->upload(User::factory()->campaigner()->create(), $transaction)
            ->assertForbidden()
            ->assertJsonPath('error.code', 'FORBIDDEN');

        $this->assertSame(0, Receipt::query()->count());
    }

    public function test_a_second_receipt_for_the_same_disbursement_is_rejected(): void
    {
        $transaction = $this->capturedTransaction();
        $campaigner = $transaction->campaign->campaigner;

        $this->upload($campaigner, $transaction)->assertStatus(202);

        $this->upload($campaigner, $transaction)
            ->assertStatus(409)
            ->assertJsonPath('error.code', 'CONFLICT_STATE');

        $this->assertSame(1, Receipt::query()->count());
    }
}
