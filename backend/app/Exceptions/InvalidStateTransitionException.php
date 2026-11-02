<?php

declare(strict_types=1);

namespace App\Exceptions;

use BackedEnum;
use RuntimeException;

class InvalidStateTransitionException extends RuntimeException
{
    public function __construct(public readonly BackedEnum $from, public readonly BackedEnum $to)
    {
        parent::__construct(
            "Illegal state transition from [{$from->value}] to [{$to->value}]."
        );
    }
}
