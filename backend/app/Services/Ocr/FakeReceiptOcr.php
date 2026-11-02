<?php

declare(strict_types=1);

namespace App\Services\Ocr;

use App\Contracts\ReceiptOcr;

/**
 * Deterministic offline driver (D-004). It deliberately returns one known
 * receipt shape so the whole upload → match → review flow can be exercised
 * without a network call or vendor credential.
 */
final class FakeReceiptOcr implements ReceiptOcr
{
    /**
     * @return array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}
     */
    public function extract(string $absolutePath, string $mimeType): array
    {
        return [
            'provider' => 'fake',
            'merchant_name' => 'Apotek Sehat',
            'amount' => '50000.00',
            'date' => now()->toDateString(),
            'confidence' => 0.91,
            'raw_text' => 'APOTEK SEHAT\nTOTAL 50.000,00',
        ];
    }
}
