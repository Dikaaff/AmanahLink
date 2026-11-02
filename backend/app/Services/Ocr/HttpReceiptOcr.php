<?php

declare(strict_types=1);

namespace App\Services\Ocr;

use App\Contracts\ReceiptOcr;
use App\Exceptions\OcrUnavailableException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Calls the Flask OCR boundary (D-007). The contract is fixed so swapping the
 * vision vendor only changes the OCR container, never Laravel domain code.
 */
final class HttpReceiptOcr implements ReceiptOcr
{
    /**
     * @return array{provider: string, merchant_name: ?string, amount: ?string, date: ?string, confidence: float, raw_text: ?string}
     */
    public function extract(string $absolutePath, string $mimeType): array
    {
        $contents = @file_get_contents($absolutePath);

        if ($contents === false) {
            throw new OcrUnavailableException('File nota tidak dapat dibaca.');
        }

        $endpoint = rtrim((string) config('amanahlink.ocr_service_url'), '/').'/extract';

        try {
            $response = Http::timeout((int) config('amanahlink.ocr_timeout_seconds', 10))
                ->acceptJson()
                ->post($endpoint, [
                    'image_base64' => base64_encode($contents),
                    'content_type' => $mimeType,
                ]);
        } catch (ConnectionException $e) {
            throw new OcrUnavailableException('Layanan OCR tidak dapat dihubungi.', 0, $e);
        }

        if ($response->failed()) {
            throw new OcrUnavailableException(
                'Layanan OCR mengembalikan HTTP '.$response->status().'.'
            );
        }

        $payload = $response->json();

        if (! is_array($payload) || ! is_numeric($payload['confidence'] ?? null)) {
            throw new OcrUnavailableException('Layanan OCR mengembalikan payload yang tidak sesuai kontrak.');
        }

        return [
            'provider' => (string) ($payload['provider'] ?? 'http'),
            'merchant_name' => isset($payload['merchant_name']) ? (string) $payload['merchant_name'] : null,
            'amount' => isset($payload['amount']) ? (string) $payload['amount'] : null,
            'date' => isset($payload['date']) ? (string) $payload['date'] : null,
            'confidence' => (float) $payload['confidence'],
            'raw_text' => isset($payload['raw_text']) ? (string) $payload['raw_text'] : null,
        ];
    }
}
