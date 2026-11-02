<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Services\PaymentWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

final class PaymentWebhookController
{
    public function __construct(private readonly PaymentWebhookService $webhooks) {}

    public function handle(Request $request, string $provider): JsonResponse
    {
        $event = $this->webhooks->handle($provider, $request);

        return response()->json([
            'data' => [
                'received' => true,
                'status' => $event->status->value,
            ],
        ]);
    }
}
