<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

final class CampaignNotActiveException extends RuntimeException
{
    public function __construct(string $reason = 'Kampanye tidak menerima donasi saat ini.')
    {
        parent::__construct($reason);
    }
}
