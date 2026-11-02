<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Support\Money;
use RuntimeException;

final class LimitExceededException extends RuntimeException
{
    public function __construct(
        public readonly string $scope,
        public readonly Money $remaining,
    ) {
        parent::__construct(
            $scope === 'daily'
                ? 'Pencairan melebihi limit harian kampanye.'
                : 'Pencairan melebihi limit bulanan kampanye.'
        );
    }
}
