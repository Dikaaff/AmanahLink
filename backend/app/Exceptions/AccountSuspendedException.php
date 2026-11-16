<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class AccountSuspendedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Akun ini sedang ditangguhkan. Hubungi administrator platform.');
    }
}
