<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\Donation;
use App\Support\Payment\PaymentInstruction;

/**
 * Boundary for the pay-in rail (Midtrans / Xendit / fake). Nothing above this
 * interface may know provider-specific payloads, so the fake driver lets the
 * whole flow run offline while tests stay deterministic.
 */
interface PaymentGateway
{
    public function name(): string;

    public function createPayment(Donation $donation): PaymentInstruction;
}
