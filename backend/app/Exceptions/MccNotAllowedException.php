<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class MccNotAllowedException extends RuntimeException
{
    public function __construct(string $reason = 'Merchant tidak termasuk kategori yang diizinkan kampanye ini.')
    {
        parent::__construct($reason);
    }
}
