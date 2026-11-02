<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\StoreDonationRequest;
use App\Http\Resources\DonationResource;
use App\Models\Campaign;
use App\Services\DonationService;
use App\Support\Money;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\ValidationException;

final class DonationController
{
    public function __construct(private readonly DonationService $donations) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = $request->user()
            ->donations()
            ->with('campaign')
            ->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return DonationResource::collection($query->paginate(15)->withQueryString());
    }

    public function store(StoreDonationRequest $request): JsonResponse
    {
        $key = trim((string) $request->header('Idempotency-Key'));

        if ($key === '' || strlen($key) > 100) {
            throw ValidationException::withMessages([
                'idempotency_key' => ['Header Idempotency-Key wajib diisi (maksimal 100 karakter).'],
            ]);
        }

        $campaign = Campaign::query()->findOrFail($request->integer('campaign_id'));

        $result = $this->donations->initiate(
            $request->user(),
            $campaign->getKey(),
            Money::of((string) $request->input('amount')),
            $key,
        );

        return response()->json([
            'data' => [
                'donation' => new DonationResource($result['donation']->load('campaign')),
                'payment' => $result['payment'],
            ],
            'meta' => [
                'replayed' => $result['replayed'],
            ],
        ], $result['replayed'] ? 200 : 201);
    }
}
