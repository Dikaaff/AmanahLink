<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\ReceiptStatus;
use App\Models\AuditLog;
use App\Models\Receipt;
use App\Services\AuditLogger;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * NFR-08 retention: log files 90 hours, audit rows 5 years, receipt images
 * 24 hours after the receipt reaches a terminal state.
 *
 * The receipt row, OCR payload, and confidence score stay in the database so
 * the audit trail remains queryable after the raw image is removed.
 */
final class PruneExpiredData extends Command
{
    protected $signature = 'amanah:retention {--dry-run : Report what would be pruned without deleting}';

    protected $description = 'Prune application logs, expired audit rows, and receipt images';

    public function handle(AuditLogger $audit): int
    {
        $dryRun = (bool) $this->option('dry-run');

        $logs = $this->pruneLogFiles($dryRun);
        $audits = $this->pruneAuditLogs($dryRun);
        $receipts = $this->pruneReceiptFiles($dryRun, $audit);

        $verb = $dryRun ? 'Would prune' : 'Pruned';

        $this->info("{$verb} {$logs} log file(s), {$audits} audit row(s), {$receipts} receipt image(s).");

        return self::SUCCESS;
    }

    private function pruneLogFiles(bool $dryRun): int
    {
        $cutoff = now()
            ->subHours((int) config('amanahlink.app_log_retention_hours', 90))
            ->getTimestamp();

        $files = glob(storage_path('logs/*.log')) ?: [];
        $pruned = 0;

        foreach ($files as $file) {
            $modifiedAt = @filemtime($file);

            if ($modifiedAt === false || $modifiedAt >= $cutoff) {
                continue;
            }

            if ($dryRun || @unlink($file)) {
                $pruned++;
            }
        }

        return $pruned;
    }

    private function pruneAuditLogs(bool $dryRun): int
    {
        $cutoff = now()->subYears((int) config('amanahlink.audit_log_retention_years', 5));

        $query = AuditLog::query()->where('created_at', '<', $cutoff);

        if ($dryRun) {
            return $query->count();
        }

        return $query->delete();
    }

    private function pruneReceiptFiles(bool $dryRun, AuditLogger $audit): int
    {
        $cutoff = now()->subHours((int) config('amanahlink.receipt_file_retention_hours', 24));
        $pruned = 0;

        Receipt::query()
            ->whereNotNull('file_path')
            ->where('created_at', '<', $cutoff)
            ->whereIn('status', [
                ReceiptStatus::Verified->value,
                ReceiptStatus::Approved->value,
                ReceiptStatus::Rejected->value,
            ])
            ->orderBy('id')
            ->chunkById(100, function ($receipts) use ($dryRun, $audit, &$pruned): void {
                foreach ($receipts as $receipt) {
                    $disk = Storage::disk('local');

                    if (! $disk->exists($receipt->file_path)) {
                        continue;
                    }

                    if ($dryRun) {
                        $pruned++;

                        continue;
                    }

                    $disk->delete($receipt->file_path);
                    $pruned++;

                    $audit->record('receipt.file_pruned', $receipt, [
                        'file_path' => $receipt->file_path,
                    ], [
                        'status' => $receipt->status->value,
                        'retention_hours' => (int) config('amanahlink.receipt_file_retention_hours', 24),
                    ]);
                }
            });

        return $pruned;
    }
}
