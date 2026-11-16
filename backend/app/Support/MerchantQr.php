<?php

declare(strict_types=1);

namespace App\Support;

use App\Enums\MerchantStatus;
use App\Models\Merchant;
use App\Support\Payment\QrCode;

/**
 * System-issued merchant QR for the disbursement scan flow (D-032).
 *
 * The payload carries the merchant id and MCC plus a truncated HMAC so a
 * campaigner can only spend at a merchant the platform actually registered.
 * Because the signature covers the MCC, editing the MCC inside the payload
 * invalidates it, and any later change to the merchant's MCC or status makes
 * previously printed QR codes stop resolving.
 */
final class MerchantQr
{
    private const PREFIX = 'AMANAH:MERCHANT:';

    private const SIGNATURE_BYTES = 18;

    /**
     * Raw payload that goes into the QR image.
     */
    public function payload(Merchant $merchant): string
    {
        return self::PREFIX.$merchant->getKey().':'.$merchant->mcc.':'.$this->signature($merchant);
    }

    /**
     * Render the payload as an SVG data URI for an `<img src>`.
     */
    public function image(Merchant $merchant, int $scale = 8): string
    {
        return QrCode::svgDataUri($this->payload($merchant), $scale);
    }

    /**
     * Resolve a scanned payload back to a verified merchant, or null when the
     * payload is malformed, forged, stale, or the merchant is not verified.
     */
    public function resolve(string $payload): ?Merchant
    {
        $trimmed = trim($payload);

        if (! str_starts_with($trimmed, self::PREFIX)) {
            return null;
        }

        $parts = explode(':', substr($trimmed, strlen(self::PREFIX)));

        if (count($parts) !== 3) {
            return null;
        }

        [$id, $mcc, $signature] = $parts;

        if (! ctype_digit($id) || $mcc === '' || $signature === '') {
            return null;
        }

        $merchant = Merchant::query()->find((int) $id);

        if ($merchant === null || ! hash_equals($this->signature($merchant), $signature)) {
            return null;
        }

        if ($merchant->mcc !== $mcc || $merchant->status !== MerchantStatus::Verified) {
            return null;
        }

        return $merchant;
    }

    private function signature(Merchant $merchant): string
    {
        $message = 'merchant-qr|'.$merchant->getKey().'|'.$merchant->mcc;
        $digest = hash_hmac('sha256', $message, (string) config('app.key'), true);

        return rtrim(strtr(base64_encode(substr($digest, 0, self::SIGNATURE_BYTES)), '+/', '-_'), '=');
    }
}
