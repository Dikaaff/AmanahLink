<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class IdempotencyMismatchException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Idempotency-Key yang sama dipakai dengan payload berbeda.');
    }
}
