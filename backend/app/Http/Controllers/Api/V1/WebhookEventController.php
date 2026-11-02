<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\WebhookStatus;
use App\Http\Resources\WebhookEventResource;
use App\Models\WebhookEvent;
use App\Services\PaymentWebhookService;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

/**
 * Operational view of the webhook ledger (US-29). Replay is the only mutating
 * action; it is safe because settlement is idempotent on payment_ref.
 */
final class WebhookEventController
{
    public function __construct(private readonly PaymentWebhookService $webhooks) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('manage-webhooks');

        $validated = $request->validate([
            'status' => ['nullable', Rule::enum(WebhookStatus::class)],
            'provider' => ['nullable', 'string', 'max:40'],
            'external_id' => ['nullable', 'string', 'max:120'],
        ]);

        $query = WebhookEvent::query()
            ->when(isset($validated['status']), fn ($builder) => $builder->where('status', $validated['status']))
            ->when(isset($validated['provider']), fn ($builder) => $builder->where('provider', $validated['provider']))
            ->when(isset($validated['external_id']), fn ($builder) => $builder->where('external_id', $validated['external_id']))
            ->orderByDesc('created_at')
            ->orderByDesc('id');

        return WebhookEventResource::collection($query->cursorPaginate(25));
    }

    public function replay(Request $request, WebhookEvent $webhookEvent): JsonResponse
    {
        Gate::authorize('manage-webhooks');

        if (! in_array($webhookEvent->status, [WebhookStatus::Failed, WebhookStatus::DeadLetter], true)) {
            return ApiError::response(
                'CONFLICT_STATE',
                'Hanya event gagal atau dead-letter yang dapat di-replay.',
                409,
                ['status' => $webhookEvent->status->value],
            );
        }

        $replayed = $this->webhooks->replay($webhookEvent, $request->user());

        return (new WebhookEventResource($replayed))
            ->response()
            ->setStatusCode(200);
    }
}
