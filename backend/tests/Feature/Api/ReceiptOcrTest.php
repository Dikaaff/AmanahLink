<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Contracts\ReceiptOcr;
use App\Enums\MerchantStatus;
use App\Enums\ReceiptStatus;
use App\Exceptions\OcrUnavailableException;
use App\Models\AuditLog;
use App\Models\Campaign;
use App\Models\Merchant;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Services\ReceiptService;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class ReceiptOcrTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
        Storage::fake('local');
    }

    /**
     * @return array{0: Receipt, 1: Transaction, 2: Campaign}
     */
    private function scenario(): array
    {
        $campaign = Campaign::factory()->active()->create([
            'allowed_mcc_array' => ['5912', '8062'],
        ]);

        Merchant::create([
            'name' => 'Apotek Sehat',
            'mcc' => '5912',
            'mid' => 'MID-OCR-1',
            'status' => MerchantStatus::Verified,
            'city' => 'Bandung',
        ]);

        $transaction = Transaction::factory()->captured()->create([
            'campaign_id' => $campaign->id,
            'user_id' => $campaign->user_id,
            'type' => 'disbursement',
            'amount' => '50000.00',
            'mcc_used' => '5912',
        ]);

        Storage::disk('local')->put('receipts/nota.jpg', 'fake-image-bytes');

        $receipt = Receipt::create([
            'transaction_id' => $transaction->id,
            'file_path' => 'receipts/nota.jpg',
            'status' => ReceiptStatus::Uploaded,
        ]);

        return [$receipt, $transaction, $campaign];
    }

    /**
     * @param  array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}  $result
     */
    private function bindOcrResult(array $result): void
    {
        $this->app->instance(ReceiptOcr::class, new class($result) implements ReceiptOcr
        {
            /**
             * @param  array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}  $result
             */
            public function __construct(private readonly array $result) {}

            public function extract(string $absolutePath, string $mimeType): array
            {
                return $this->result;
            }
        });
    }

    private function bindFailingOcr(): void
    {
        $this->app->instance(ReceiptOcr::class, new class implements ReceiptOcr
        {
            public function extract(string $absolutePath, string $mimeType): array
            {
                throw new OcrUnavailableException('Layanan OCR timeout.');
            }
        });
    }

    /**
     * @return array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}
     */
    private function ocrResult(string $amount = '50000.00', float $confidence = 0.91, string $merchant = 'Apotek Sehat'): array
    {
        return [
            'provider' => 'fake',
            'merchant_name' => $merchant,
            'amount' => $amount,
            'date' => now()->toDateString(),
            'confidence' => $confidence,
            'raw_text' => 'APOTEK SEHAT',
        ];
    }

    public function test_a_confident_matching_receipt_is_verified_and_reconciled(): void
    {
        [$receipt, $transaction] = $this->scenario();

        $processed = app(ReceiptService::class)->process($receipt);

        $this->assertSame('verified', $processed->status->value);
        $this->assertSame('0.91', $processed->confidence);
        $this->assertSame('reconciled', $transaction->refresh()->status->value);
        $this->assertSame('Apotek Sehat', $processed->ocr_payload['merchant_name']);

        $this->assertDatabaseHas('audit_logs', ['action' => 'receipt.verified']);
        $this->assertDatabaseHas('audit_logs', ['action' => 'disbursement.reconciled']);
    }

    public function test_low_confidence_goes_to_manual_review(): void
    {
        [$receipt, $transaction] = $this->scenario();

        $this->bindOcrResult($this->ocrResult(confidence: 0.52));

        $processed = app(ReceiptService::class)->process($receipt);

        $this->assertSame('needs_review', $processed->status->value);
        $this->assertSame('receipt_pending', $transaction->refresh()->status->value);
        $this->assertSame('low_confidence', $this->lastNeedsReviewReason());
    }

    public function test_an_amount_outside_the_tolerance_goes_to_manual_review(): void
    {
        [$receipt, $transaction] = $this->scenario();

        $this->bindOcrResult($this->ocrResult(amount: '52000.00'));

        $processed = app(ReceiptService::class)->process($receipt);

        $this->assertSame('needs_review', $processed->status->value);
        $this->assertSame('receipt_pending', $transaction->refresh()->status->value);
        $this->assertSame('amount_mismatch', $this->lastNeedsReviewReason());
    }

    public function test_an_amount_within_one_percent_still_matches(): void
    {
        [$receipt] = $this->scenario();

        $this->bindOcrResult($this->ocrResult(amount: '50500.00'));

        $this->assertSame('verified', app(ReceiptService::class)->process($receipt)->status->value);
    }

    public function test_a_merchant_outside_the_registry_goes_to_manual_review(): void
    {
        [$receipt] = $this->scenario();

        $this->bindOcrResult($this->ocrResult(merchant: 'Toko Tidak Terdaftar'));

        $processed = app(ReceiptService::class)->process($receipt);

        $this->assertSame('needs_review', $processed->status->value);
        $this->assertSame('merchant_mismatch', $this->lastNeedsReviewReason());
    }

    public function test_an_ocr_timeout_marks_needs_review_instead_of_failing_the_request(): void
    {
        [$receipt, $transaction] = $this->scenario();

        $this->bindFailingOcr();

        $processed = app(ReceiptService::class)->process($receipt);

        $this->assertSame('needs_review', $processed->status->value);
        $this->assertSame('receipt_pending', $transaction->refresh()->status->value);

        /** @var AuditLog $audit */
        $audit = AuditLog::query()->where('action', 'ocr.timeout')->sole();

        $this->assertSame('timeout', $audit->after['reason']);
    }

    public function test_upload_processes_the_receipt_synchronously_in_the_test_queue(): void
    {
        [$receipt, $transaction, $campaign] = $this->scenario();

        $receipt->delete();

        Sanctum::actingAs($campaign->campaigner);

        $this->post(
            "/api/v1/disbursements/{$transaction->id}/receipts",
            ['file' => UploadedFile::fake()->create('nota.jpg', 100, 'image/jpeg')],
            ['Accept' => 'application/json'],
        )->assertStatus(202);

        $this->assertSame('verified', Receipt::query()->sole()->status->value);
        $this->assertSame('reconciled', $transaction->refresh()->status->value);
    }

    private function lastNeedsReviewReason(): string
    {
        /** @var AuditLog $audit */
        $audit = AuditLog::query()->where('action', 'receipt.needs_review')->latest('id')->firstOrFail();

        return (string) ($audit->after['reason'] ?? '');
    }
}
