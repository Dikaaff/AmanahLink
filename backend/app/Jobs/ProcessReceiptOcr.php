<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Receipt;
use App\Services\ReceiptService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class ProcessReceiptOcr implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public readonly int $receiptId) {}

    public function handle(ReceiptService $receipts): void
    {
        $receipt = Receipt::query()->find($this->receiptId);

        if ($receipt === null) {
            return;
        }

        $receipts->process($receipt);
    }
}
