<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class LimitExpiredException extends RuntimeException
{
    public function __construct(string $reason = 'Limit pencairan kampanye sudah tidak berlaku.')
    {
        parent::__construct($reason);
    }
}
