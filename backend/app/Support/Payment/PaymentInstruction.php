<?php

declare(strict_types=1);

namespace App\Support\Payment;

use DateTimeImmutable;

/**
 * Provider-agnostic payment instruction returned to the donor. Contains no
 * secrets and is safe to serialize into an API response.
 *
 * The QR fields are optional because not every rail issues one; the offline
 * driver fills them with a simulated QRIS payload so the demo has something
 * scannable, and real adapters fill them with the provider's QR string.
 */
final readonly class PaymentInstruction
{
    public function __construct(
        public string $provider,
        public string $paymentRef,
        public string $paymentUrl,
        public string $vaNumber,
        public DateTimeImmutable $expiresAt,
        public ?string $qrString = null,
        public ?string $qrImage = null,
    ) {}

    /**
     * @return array<string, string>
     */
    public function toArray(): array
    {
        $instruction = [
            'provider' => $this->provider,
            'payment_ref' => $this->paymentRef,
            'payment_url' => $this->paymentUrl,
            'va_number' => $this->vaNumber,
            'expires_at' => $this->expiresAt->format(DateTimeImmutable::ATOM),
        ];

        if ($this->qrString !== null) {
            $instruction['qr_string'] = $this->qrString;
        }

        if ($this->qrImage !== null) {
            $instruction['qr_image'] = $this->qrImage;
        }

        return $instruction;
    }
}
