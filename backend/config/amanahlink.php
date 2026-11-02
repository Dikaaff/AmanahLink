<?php

declare(strict_types=1);

return [
    /*
    |--------------------------------------------------------------------------
    | Platform Fee
    |--------------------------------------------------------------------------
    |
    | Charged once at settlement time. Refunds of unspent funds do not take
    | the fee twice (see DECISIONS.md D-002 / BR-05).
    |
    */
    'platform_fee_percent' => env('AMANAH_PLATFORM_FEE_PERCENT', '2.00'),

    'min_donation' => env('AMANAH_MIN_DONATION', '10000.00'),

    'max_donation' => env('AMANAH_MAX_DONATION', '1000000000.00'),

    /*
    |--------------------------------------------------------------------------
    | Pay-in Rail
    |--------------------------------------------------------------------------
    |
    | `fake` is deterministic and offline (D-004). Switch to a real driver only
    | after the sandbox contract is signed, never from user input.
    |
    */
    'payment_driver' => env('AMANAH_PAYMENT_DRIVER', 'fake'),

    'payment_expiry_hours' => (int) env('AMANAH_PAYMENT_EXPIRY_HOURS', 24),

    /*
    |--------------------------------------------------------------------------
    | Webhook Signature
    |--------------------------------------------------------------------------
    |
    | HMAC-SHA256 over the raw request body. Empty secret means every callback
    | is rejected, which is the safe default when no rail is configured.
    |
    */
    'payment_webhook_secret' => env('AMANAH_PAYMENT_WEBHOOK_SECRET', ''),

    /*
    |--------------------------------------------------------------------------
    | OCR
    |--------------------------------------------------------------------------
    */
    'ocr_confidence_threshold' => env('AMANAH_OCR_CONFIDENCE', '0.75'),
    'ocr_amount_tolerance_percent' => env('AMANAH_OCR_AMOUNT_TOLERANCE', '1'),
    'ocr_driver' => env('AMANAH_OCR_DRIVER', 'fake'),
    'ocr_service_url' => env('AMANAH_OCR_SERVICE_URL', 'http://127.0.0.1:5001'),
    'ocr_timeout_seconds' => (int) env('AMANAH_OCR_TIMEOUT', 10),
    'receipt_max_bytes' => (int) env('AMANAH_RECEIPT_MAX_BYTES', 5 * 1024 * 1024),
];
