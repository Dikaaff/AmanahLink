<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\CampaignStatus;
use App\Http\Requests\FreezeCampaignRequest;
use App\Http\Requests\ReviewCampaignRequest;
use App\Http\Requests\StoreCampaignRequest;
use App\Http\Requests\UpdateCampaignRequest;
use App\Http\Resources\CampaignResource;
use App\Models\Campaign;
use App\Services\CampaignService;
use App\Services\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class CampaignController
{
    public function __construct(
        private readonly CampaignService $campaigns,
        private readonly RefundService $refunds,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Campaign::query()
            ->publiclyVisible()
            ->with('campaigner')
            ->latest();

        if ($request->filled('q')) {
            $term = '%'.$request->string('q')->toString().'%';
            $query->where(fn ($builder) => $builder
                ->where('title', 'like', $term)
                ->orWhere('description', 'like', $term));
        }

        return CampaignResource::collection($query->paginate(15)->withQueryString());
    }

    public function mine(Request $request): AnonymousResourceCollection
    {
        $query = Campaign::query()
            ->where('user_id', $request->user()->getKey())
            ->with('campaigner')
            ->latest();

        return CampaignResource::collection($query->paginate(15)->withQueryString());
    }

    public function reviewQueue(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewReviewQueue', Campaign::class);

        $request->validate([
            'status' => [
                'nullable',
                Rule::in(array_map(
                    static fn (CampaignStatus $status): string => $status->value,
                    CampaignStatus::cases(),
                )),
            ],
        ]);

        $query = Campaign::query()
            ->with('campaigner')
            ->when(
                $request->filled('status'),
                fn ($builder) => $builder->where('status', $request->string('status')->toString()),
            )
            ->latest();

        return CampaignResource::collection($query->paginate(15)->withQueryString());
    }

    public function show(Request $request, Campaign $campaign): JsonResponse
    {
        $viewer = $request->user();

        $canSeeUnpublished = $viewer !== null
            && ($viewer->getKey() === $campaign->user_id || $viewer->role->isStaff());

        if (! $campaign->isPubliclyVisible() && ! $canSeeUnpublished) {
            abort(404);
        }

        $campaign->load('campaigner');

        return response()->json(['data' => new CampaignResource($campaign)]);
    }

    public function store(StoreCampaignRequest $request): JsonResponse
    {
        $campaign = $this->campaigns->create($request->user(), $request->validated());

        return response()->json([
            'data' => new CampaignResource($campaign->load('campaigner')),
        ], 201);
    }

    public function update(UpdateCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $updated = $this->campaigns->update($campaign, $request->validated());

        return response()->json([
            'data' => new CampaignResource($updated->load('campaigner')),
        ]);
    }

    public function submit(Request $request, Campaign $campaign): JsonResponse
    {
        Gate::authorize('submit', $campaign);

        $submitted = $this->campaigns->submit($campaign, $request->user());

        return response()->json([
            'data' => new CampaignResource($submitted->load('campaigner')),
        ]);
    }

    public function review(ReviewCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $reviewed = $this->campaigns->review(
            $campaign,
            $request->user(),
            $request->string('decision')->toString(),
            $request->input('rejection_reason'),
        );

        return response()->json([
            'data' => new CampaignResource($reviewed->load('campaigner')),
        ]);
    }

    public function freeze(FreezeCampaignRequest $request, Campaign $campaign): JsonResponse
    {
        $frozen = $this->campaigns->freeze($campaign, $request->user(), $request->string('reason')->toString());

        return response()->json([
            'data' => new CampaignResource($frozen->load('campaigner')),
        ]);
    }

    public function unfreeze(Request $request, Campaign $campaign): JsonResponse
    {
        Gate::authorize('unfreeze', $campaign);

        $unfrozen = $this->campaigns->unfreeze($campaign, $request->user());

        return response()->json([
            'data' => new CampaignResource($unfrozen->load('campaigner')),
        ]);
    }

    public function close(Request $request, Campaign $campaign): JsonResponse
    {
        Gate::authorize('close', $campaign);

        $result = $this->refunds->closeAndRefund($campaign, $request->user());

        return response()->json([
            'data' => new CampaignResource($result['campaign']->load('campaigner')),
            'refund' => [
                'donor_count' => $result['donor_count'],
                'total' => $result['total'],
            ],
        ]);
    }
}
