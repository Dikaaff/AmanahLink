<?php

declare(strict_types=1);

namespace App\Support\Payment;

use DateTimeImmutable;

/**
 * Provider-agnostic payment instruction returned to the donor. Contains no
 * secrets and is safe to serialize into an API response.
 */
final readonly class PaymentInstruction
{
    public function __construct(
        public string $provider,
        public string $paymentRef,
        public string $paymentUrl,
        public string $vaNumber,
        public DateTimeImmutable $expiresAt,
    ) {}

    /**
     * @return array<string, string>
     */
    public function toArray(): array
    {
        return [
            'provider' => $this->provider,
            'payment_ref' => $this->paymentRef,
            'payment_url' => $this->paymentUrl,
            'va_number' => $this->vaNumber,
            'expires_at' => $this->expiresAt->format(DateTimeImmutable::ATOM),
        ];
    }
}
