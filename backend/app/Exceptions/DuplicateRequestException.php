<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class DuplicateRequestException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Permintaan dengan Idempotency-Key ini sedang diproses.');
    }
}
