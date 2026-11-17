<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * Spending is paused for one campaign because an earlier payment still lacks
 * accepted proof. The campaigner can clear it by uploading a replacement
 * receipt (reviewed by a different admin) or by admin write-off.
 */
final class SpendingHeldException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $holdCode,
        public readonly ?string $referenceId = null,
    ) {
        parent::__construct($message);
    }
}
