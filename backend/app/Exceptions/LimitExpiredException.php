<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class LimitExpiredException extends RuntimeException
{
    public function __construct(string $reason = 'Masa berlaku batas belanja kampanye sudah lewat.')
    {
        parent::__construct($reason);
    }
}
