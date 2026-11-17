<?php

declare(strict_types=1);

namespace App\Services;

use App\Contracts\ReceiptOcr;
use App\Enums\MerchantStatus;
use App\Enums\ReceiptStatus;
use App\Enums\TransactionStatus;
use App\Enums\TransactionType;
use App\Exceptions\InvalidStateTransitionException;
use App\Exceptions\OcrUnavailableException;
use App\Jobs\ProcessReceiptOcr;
use App\Models\Campaign;
use App\Models\MccCode;
use App\Models\Merchant;
use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use App\Notifications\DisputeWrittenOff;
use App\Notifications\ReceiptRejected;
use App\Support\Money;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

/**
 * Receipt lifecycle: upload → extracting → auto-match / needs review.
 *
 * Auto-match is deliberately conservative (US-23): confidence must pass the
 * threshold, the extracted amount must sit within tolerance of the captured
 * transaction, and the merchant must exist in the verified registry with an
 * MCC the campaign allows. Anything less goes to a human, never to a silent
 * approval.
 */
final class ReceiptService
{
    public function __construct(
        private readonly ReceiptOcr $ocr,
        private readonly AuditLogger $audit,
    ) {}

    public function upload(User $actor, Transaction $transaction, UploadedFile $file): Receipt
    {
        if ($transaction->type !== TransactionType::Disbursement) {
            throw ValidationException::withMessages([
                'transaction' => ['Hanya transaksi pembayaran ke merchant yang dapat dilampiri nota.'],
            ]);
        }

        $isReplacement = $transaction->status === TransactionStatus::Disputed;

        $path = $file->store('receipts/'.$transaction->campaign_id, 'local');

        if ($path === false) {
            throw new \RuntimeException('Nota gagal disimpan.');
        }

        $receipt = DB::transaction(function () use ($actor, $transaction, $path, $isReplacement): Receipt {
            $receipt = Receipt::create([
                'transaction_id' => $transaction->getKey(),
                'file_path' => $path,
                'status' => ReceiptStatus::Uploaded,
            ]);

            // A replacement for a rejected receipt stays on the disputed
            // transaction until a second reviewer accepts it, so the spending
            // hold is released by approval, never by the upload itself.
            if (! $isReplacement) {
                $this->moveTransaction($transaction, TransactionStatus::ReceiptPending);
            }

            $this->audit->record(
                $isReplacement ? 'receipt.replacement_uploaded' : 'receipt.uploaded',
                $receipt,
                null,
                [
                    'transaction_id' => $transaction->getKey(),
                    'file_path' => $path,
                ],
                $actor,
            );

            return $receipt;
        });

        ProcessReceiptOcr::dispatch($receipt->getKey());

        return $receipt->refresh();
    }

    public function process(Receipt $receipt): Receipt
    {
        $receipt = $this->markExtracting($receipt);

        if ($receipt->status !== ReceiptStatus::Extracting) {
            return $receipt;
        }

        $absolutePath = Storage::disk('local')->path($receipt->file_path);
        $mimeType = mime_content_type($absolutePath) ?: 'image/jpeg';

        try {
            $result = $this->ocr->extract($absolutePath, $mimeType);
        } catch (OcrUnavailableException $e) {
            return $this->markNeedsReview($receipt, 'timeout', $e->getMessage());
        }

        return $this->finalize($receipt, $result);
    }

    public function review(Receipt $receipt, User $reviewer, string $decision, ?string $reason = null): Receipt
    {
        return DB::transaction(function () use ($receipt, $reviewer, $decision, $reason): Receipt {
            /** @var Receipt $locked */
            $locked = Receipt::query()->whereKey($receipt->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReceiptStatus::NeedsReview) {
                throw new InvalidStateTransitionException(
                    $locked->status,
                    $decision === 'approve' ? ReceiptStatus::Approved : ReceiptStatus::Rejected,
                );
            }

            /** @var Transaction $transaction */
            $transaction = Transaction::query()
                ->whereKey($locked->transaction_id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($decision === 'approve') {
                $isReplacement = $transaction->status === TransactionStatus::Disputed;

                if ($isReplacement) {
                    $this->ensureDifferentReviewer($transaction, $reviewer);
                } else {
                    $this->ensureReceiptPending($transaction);
                }

                $locked->forceFill([
                    'status' => ReceiptStatus::Approved,
                    'reviewed_by' => $reviewer->getKey(),
                    'reviewed_at' => now(),
                    'rejection_reason' => null,
                ])->save();

                // Disputed is a terminal branch with one exit: reconciliation.
                // A normal receipt still walks verified → reconciled so the
                // audit trail keeps both steps.
                if ($isReplacement) {
                    $this->moveTransaction($transaction, TransactionStatus::Reconciled);
                } else {
                    $this->moveTransaction($transaction, TransactionStatus::Verified);
                    $this->moveTransaction($transaction, TransactionStatus::Reconciled);
                }

                $this->audit->record('receipt.approved', $locked, null, [
                    'transaction_id' => $transaction->getKey(),
                    'reviewer_id' => $reviewer->getKey(),
                    'replacement' => $isReplacement,
                ], $reviewer);

                $this->audit->record('disbursement.reconciled', $transaction, null, [
                    'reference_id' => $transaction->reference_id,
                    'receipt_id' => $locked->getKey(),
                ], $reviewer);
            } else {
                $locked->forceFill([
                    'status' => ReceiptStatus::Rejected,
                    'reviewed_by' => $reviewer->getKey(),
                    'reviewed_at' => now(),
                    'rejection_reason' => $reason,
                ])->save();

                $this->moveTransaction($transaction, TransactionStatus::Disputed);

                $this->audit->record('receipt.rejected', $locked, null, [
                    'transaction_id' => $transaction->getKey(),
                    'reviewer_id' => $reviewer->getKey(),
                    'rejection_reason' => $reason,
                ], $reviewer);

                $this->notifyCampaignerOfRejection($transaction, $reason);
            }

            return $locked->refresh();
        });
    }

    /**
     * Close a dispute without a merchant refund: the platform absorbs the loss,
     * the merchant is suspended, and the decision is audited. Reconciled is the
     * only state disputed may move to, which releases the spending hold.
     */
    public function writeOff(Transaction $transaction, string $reason, ?User $actor = null): Transaction
    {
        return DB::transaction(function () use ($transaction, $reason, $actor): Transaction {
            /** @var Transaction $locked */
            $locked = Transaction::query()->whereKey($transaction->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== TransactionStatus::Disputed) {
                throw new InvalidStateTransitionException($locked->status, TransactionStatus::Reconciled);
            }

            $locked->forceFill(['status' => TransactionStatus::Reconciled])->save();

            $merchant = $locked->merchant;

            if ($merchant !== null) {
                $merchant->update(['status' => MerchantStatus::Suspended]);
            }

            $this->audit->record('disbursement.written_off', $locked, null, [
                'reference_id' => $locked->reference_id,
                'merchant_id' => $locked->merchant_id,
                'reason' => $reason,
            ], $actor);

            $campaign = $locked->campaign;
            $campaigner = $campaign?->campaigner;

            if ($campaign !== null && $campaigner !== null) {
                Notification::send($campaigner, new DisputeWrittenOff($locked, $campaign, $reason));
            }

            return $locked->refresh();
        });
    }

    /**
     * Maker-checker: the staff member who rejected a receipt must not also
     * release the hold by approving its replacement. One person could
     * otherwise reject and clear a fraud flag alone.
     */
    private function ensureDifferentReviewer(Transaction $transaction, User $reviewer): void
    {
        $rejectedBy = Receipt::query()
            ->where('transaction_id', $transaction->getKey())
            ->where('status', ReceiptStatus::Rejected->value)
            ->latest('id')
            ->value('reviewed_by');

        if ($rejectedBy === null || (int) $rejectedBy !== $reviewer->getKey()) {
            return;
        }

        throw ValidationException::withMessages([
            'decision' => ['Nota pengganti harus ditinjau oleh staf lain, bukan staf yang menolak nota sebelumnya.'],
        ]);
    }

    private function notifyCampaignerOfRejection(Transaction $transaction, ?string $reason): void
    {
        $campaign = $transaction->campaign;
        $campaigner = $campaign?->campaigner;

        if ($campaign === null || $campaigner === null) {
            return;
        }

        Notification::send($campaigner, new ReceiptRejected($transaction, $campaign, $reason));
    }

    private function markExtracting(Receipt $receipt): Receipt
    {
        return DB::transaction(function () use ($receipt): Receipt {
            /** @var Receipt $locked */
            $locked = Receipt::query()->whereKey($receipt->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReceiptStatus::Uploaded) {
                return $locked;
            }

            if (! $locked->status->canTransitionTo(ReceiptStatus::Extracting)) {
                throw new InvalidStateTransitionException($locked->status, ReceiptStatus::Extracting);
            }

            /** @var Transaction $transaction */
            $transaction = Transaction::query()
                ->whereKey($locked->transaction_id)
                ->lockForUpdate()
                ->firstOrFail();

            $this->ensureReceiptPending($transaction);

            $locked->forceFill(['status' => ReceiptStatus::Extracting])->save();

            return $locked;
        });
    }

    /**
     * @param  array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}  $result
     */
    private function finalize(Receipt $receipt, array $result): Receipt
    {
        return DB::transaction(function () use ($receipt, $result): Receipt {
            /** @var Receipt $locked */
            $locked = Receipt::query()->whereKey($receipt->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReceiptStatus::Extracting) {
                return $locked;
            }

            $locked->forceFill([
                'ocr_payload' => $result,
                'confidence' => number_format($result['confidence'], 2, '.', ''),
            ]);

            /** @var Transaction $transaction */
            $transaction = Transaction::query()
                ->whereKey($locked->transaction_id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var Campaign $campaign */
            $campaign = Campaign::query()
                ->whereKey($transaction->campaign_id)
                ->lockForUpdate()
                ->firstOrFail();

            $reason = $this->mismatchReason($transaction, $campaign, $result);

            // A replacement receipt is never auto-approved: a human who did
            // not reject the first attempt must accept it (maker-checker).
            if ($reason === null && $transaction->status === TransactionStatus::Disputed) {
                $reason = 'replacement_receipt';
            }

            if ($reason !== null) {
                $locked->forceFill(['status' => ReceiptStatus::NeedsReview])->save();

                $this->audit->record('receipt.needs_review', $locked, null, [
                    'reason' => $reason,
                    'confidence' => $result['confidence'],
                    'extracted_amount' => $result['amount'],
                    'transaction_amount' => $transaction->amount,
                ]);

                return $locked->refresh();
            }

            $locked->forceFill(['status' => ReceiptStatus::AutoMatched])->save();

            $this->ensureReceiptPending($transaction);
            $this->moveTransaction($transaction, TransactionStatus::Verified);

            $locked->forceFill(['status' => ReceiptStatus::Verified])->save();

            $this->moveTransaction($transaction, TransactionStatus::Reconciled);

            $this->audit->record('receipt.verified', $locked, null, [
                'transaction_id' => $transaction->getKey(),
                'merchant_name' => $result['merchant_name'],
                'amount' => $result['amount'],
                'confidence' => $result['confidence'],
            ]);

            $this->audit->record('disbursement.reconciled', $transaction, null, [
                'reference_id' => $transaction->reference_id,
                'receipt_id' => $locked->getKey(),
            ]);

            return $locked->refresh();
        });
    }

    private function markNeedsReview(Receipt $receipt, string $reason, string $message): Receipt
    {
        return DB::transaction(function () use ($receipt, $reason, $message): Receipt {
            /** @var Receipt $locked */
            $locked = Receipt::query()->whereKey($receipt->getKey())->lockForUpdate()->firstOrFail();

            if ($locked->status !== ReceiptStatus::Extracting) {
                return $locked;
            }

            $locked->forceFill(['status' => ReceiptStatus::NeedsReview])->save();

            $this->audit->record('ocr.'.$reason, $locked, null, [
                'reason' => $reason,
                'message' => $message,
            ]);

            return $locked->refresh();
        });
    }

    /**
     * @param  array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}  $result
     */
    private function mismatchReason(Transaction $transaction, Campaign $campaign, array $result): ?string
    {
        if ($result['confidence'] < (float) config('amanahlink.ocr_confidence_threshold')) {
            return 'low_confidence';
        }

        if ($result['amount'] === null) {
            return 'amount_missing';
        }

        try {
            $extracted = Money::of($result['amount']);
        } catch (InvalidArgumentException) {
            return 'amount_invalid';
        }

        if (! $this->amountWithinTolerance($transaction, $extracted)) {
            return 'amount_mismatch';
        }

        if (! $this->merchantAllowed($campaign, $result['merchant_name'])) {
            return 'merchant_mismatch';
        }

        return null;
    }

    private function amountWithinTolerance(Transaction $transaction, Money $extracted): bool
    {
        $expected = Money::of($transaction->amount);

        $difference = $expected->isGreaterThan($extracted)
            ? $expected->minus($extracted)
            : $extracted->minus($expected);

        $tolerance = $expected->percentOf((string) config('amanahlink.ocr_amount_tolerance_percent'));

        return ! $difference->isGreaterThan($tolerance);
    }

    private function merchantAllowed(Campaign $campaign, ?string $merchantName): bool
    {
        if ($merchantName === null || trim($merchantName) === '') {
            return false;
        }

        $merchant = Merchant::query()
            ->verified()
            ->where('name', $merchantName)
            ->first();

        if ($merchant === null) {
            return false;
        }

        if (! in_array($merchant->mcc, $campaign->allowed_mcc_array ?? [], true)) {
            return false;
        }

        return MccCode::query()
            ->where('code', $merchant->mcc)
            ->where('is_active', true)
            ->where('is_blocked', false)
            ->exists();
    }

    private function ensureReceiptPending(Transaction $transaction): void
    {
        if ($transaction->status->awaitsReceipt()) {
            $this->moveTransaction($transaction, TransactionStatus::ReceiptPending);
        }
    }

    private function moveTransaction(Transaction $transaction, TransactionStatus $next): void
    {
        if ($transaction->status === $next) {
            return;
        }

        if (! $transaction->status->canTransitionTo($next)) {
            throw new InvalidStateTransitionException($transaction->status, $next);
        }

        $transaction->forceFill(['status' => $next])->save();
    }
}
