<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Exceptions\OcrUnavailableException;

/**
 * Boundary for receipt extraction (D-007). Nothing above this interface may
 * know which vision vendor is used; the `fake` driver keeps tests offline and
 * deterministic while the real adapter is enabled by configuration.
 */
interface ReceiptOcr
{
    /**
     * @return array{
     *     provider: string,
     *     merchant_name: ?string,
     *     amount: ?string,
     *     date: ?string,
     *     confidence: float,
     *     raw_text: ?string
     * }
     *
     * @throws OcrUnavailableException when the provider cannot be reached or
     *                                 returns a payload outside the contract
     */
    public function extract(string $absolutePath, string $mimeType): array;
}
