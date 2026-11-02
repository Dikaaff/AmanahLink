<?php

declare(strict_types=1);

namespace App\Exceptions;

use RuntimeException;

/**
 * A campaign that already holds settled donations may not have its material
 * fields (title, description, target, MCC allowlist, deadline) edited.
 * Allowing it would let a campaigner change the deal after money arrived.
 */
final class CampaignLockedException extends RuntimeException
{
    public function __construct()
    {
        parent::__construct('Kampanye sudah menerima donasi, data utama tidak dapat diubah.');
    }
}
