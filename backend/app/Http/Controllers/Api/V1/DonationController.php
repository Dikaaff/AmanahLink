<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Http\Requests\StoreDonationRequest;
use App\Http\Resources\CampaignResource;
use App\Http\Resources\DonationResource;
use App\Models\Campaign;
use App\Models\Donation;
use App\Services\DonationService;
use App\Services\DonationSettlementService;
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

    /**
     * Demo-only shortcut for the offline payment driver. Real providers settle
     * through the signed webhook; this route never exists when the configured
     * driver is not `fake`.
     */
    public function simulatePayment(
        Request $request,
        Donation $donation,
        DonationSettlementService $settlements,
    ): JsonResponse {
        abort_unless(
            config('amanahlink.payment_driver') === 'fake'
                && app()->environment(['local', 'testing']),
            404,
        );

        abort_unless($donation->donor_id === $request->user()->getKey(), 403);

        $donation = $settlements->settle($donation->payment_ref);

        return response()->json([
            'data' => [
                'donation' => new DonationResource($donation->load('campaign')),
                'campaign' => new CampaignResource($donation->campaign),
            ],
        ]);
    }
}
