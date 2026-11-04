<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Enums\ReceiptStatus;
use App\Models\AuditLog;
use App\Models\Receipt;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

final class RetentionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('local');
        $this->seed(MccCodeSeeder::class);
    }

    public function test_it_prunes_log_files_older_than_ninety_hours(): void
    {
        $directory = storage_path('logs');

        if (! is_dir($directory)) {
            mkdir($directory, 0777, true);
        }

        $old = $directory.DIRECTORY_SEPARATOR.'retention-old-'.uniqid().'.log';
        $fresh = $directory.DIRECTORY_SEPARATOR.'retention-fresh-'.uniqid().'.log';

        file_put_contents($old, 'old entry');
        file_put_contents($fresh, 'fresh entry');
        touch($old, now()->subHours(91)->getTimestamp());

        try {
            $this->artisan('amanah:retention')->assertExitCode(0);

            $this->assertFileDoesNotExist($old);
            $this->assertFileExists($fresh);
        } finally {
            @unlink($old);
            @unlink($fresh);
        }
    }

    public function test_it_prunes_audit_rows_beyond_five_years(): void
    {
        AuditLog::create([
            'action' => 'legacy.event',
            'created_at' => now()->subYears(6),
        ]);

        $recent = AuditLog::create([
            'action' => 'recent.event',
            'created_at' => now()->subYears(4),
        ]);

        $this->artisan('amanah:retention')->assertExitCode(0);

        $this->assertDatabaseMissing('audit_logs', ['action' => 'legacy.event']);
        $this->assertDatabaseHas('audit_logs', ['id' => $recent->id]);
    }

    public function test_it_prunes_terminal_receipt_images_after_twenty_four_hours(): void
    {
        $approved = Receipt::factory()->create([
            'status' => ReceiptStatus::Approved,
            'file_path' => 'receipts/approved.jpg',
        ]);
        $approved->forceFill(['created_at' => now()->subHours(25)])->save();
        Storage::disk('local')->put($approved->file_path, 'image');

        $pending = Receipt::factory()->needsReview()->create([
            'file_path' => 'receipts/pending.jpg',
        ]);
        $pending->forceFill(['created_at' => now()->subHours(25)])->save();
        Storage::disk('local')->put($pending->file_path, 'image');

        $recent = Receipt::factory()->create([
            'status' => ReceiptStatus::Approved,
            'file_path' => 'receipts/recent.jpg',
        ]);
        Storage::disk('local')->put($recent->file_path, 'image');

        $this->artisan('amanah:retention')->assertExitCode(0);

        Storage::disk('local')->assertMissing($approved->file_path);
        Storage::disk('local')->assertExists($pending->file_path);
        Storage::disk('local')->assertExists($recent->file_path);

        $this->assertDatabaseHas('receipts', ['id' => $approved->id]);
        $this->assertDatabaseHas('audit_logs', ['action' => 'receipt.file_pruned']);
    }

    public function test_dry_run_reports_without_deleting(): void
    {
        $receipt = Receipt::factory()->create([
            'status' => ReceiptStatus::Approved,
            'file_path' => 'receipts/dry-run.jpg',
        ]);
        $receipt->forceFill(['created_at' => now()->subHours(25)])->save();
        Storage::disk('local')->put($receipt->file_path, 'image');

        $this->artisan('amanah:retention', ['--dry-run' => true])
            ->expectsOutputToContain('Would prune')
            ->assertExitCode(0);

        Storage::disk('local')->assertExists($receipt->file_path);
    }
}
