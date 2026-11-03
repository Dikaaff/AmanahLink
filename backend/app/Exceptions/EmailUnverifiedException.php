<?php

namespace App\Exceptions;

use RuntimeException;

final class EmailUnverifiedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Verifikasi email terlebih dahulu untuk melakukan tindakan ini.');
    }
}
