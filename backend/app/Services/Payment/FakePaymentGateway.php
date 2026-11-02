<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Contracts\PaymentGateway;
use App\Models\Donation;
use App\Support\Payment\PaymentInstruction;

/**
 * Deterministic offline rail (D-004). The same donation always yields the same
 * virtual account and URL, which makes idempotent replays byte-identical and
 * keeps tests independent of the network.
 */
final class FakePaymentGateway implements PaymentGateway
{
    public function name(): string
    {
        return 'fake';
    }

    public function createPayment(Donation $donation): PaymentInstruction
    {
        $digits = substr(hash('sha256', $donation->payment_ref), 0, 12);

        return new PaymentInstruction(
            provider: $this->name(),
            paymentRef: $donation->payment_ref,
            paymentUrl: "https://sandbox.fake.amanahlink.test/pay/{$donation->payment_ref}",
            vaNumber: '8808'.implode('', str_split($digits, 4)),
            expiresAt: $donation->expires_at->toDateTimeImmutable(),
        );
    }
}
