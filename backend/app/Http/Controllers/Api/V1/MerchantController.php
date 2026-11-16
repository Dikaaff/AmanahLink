<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Enums\MerchantStatus;
use App\Http\Requests\StoreMerchantRequest;
use App\Http\Requests\UpdateMerchantRequest;
use App\Http\Resources\MerchantResource;
use App\Models\Merchant;
use App\Services\AuditLogger;
use App\Support\MerchantQr;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

final class MerchantController
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly MerchantQr $merchantQr,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Merchant::class);

        $isManager = (bool) $request->user()?->role->canManageMerchants();

        $request->validate([
            'status' => [
                'nullable',
                Rule::in(array_map(
                    static fn (MerchantStatus $status): string => $status->value,
                    MerchantStatus::cases(),
                )),
            ],
        ]);

        $query = Merchant::query()->with('mccCode')->orderBy('name');

        if (! $isManager) {
            $query->verified();
        } elseif ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('mcc')) {
            $query->where('mcc', $request->string('mcc')->toString());
        }

        if ($request->filled('q')) {
            $term = '%'.$request->string('q')->toString().'%';
            $query->where('name', 'like', $term);
        }

        return MerchantResource::collection($query->paginate(50)->withQueryString());
    }

    public function store(StoreMerchantRequest $request): JsonResponse
    {
        $merchant = DB::transaction(function () use ($request): Merchant {
            $merchant = Merchant::create([
                'name' => $request->string('name')->toString(),
                'mcc' => $request->string('mcc')->toString(),
                'mid' => $request->string('mid')->toString(),
                'city' => $request->filled('city') ? $request->string('city')->toString() : null,
                'status' => MerchantStatus::Pending,
            ]);

            $this->audit->record('merchant.created', $merchant, null, [
                'name' => $merchant->name,
                'mcc' => $merchant->mcc,
                'status' => $merchant->status->value,
            ]);

            return $merchant;
        });

        return (new MerchantResource($merchant->load('mccCode')))
            ->response()
            ->setStatusCode(201);
    }

    public function update(UpdateMerchantRequest $request, Merchant $merchant): MerchantResource
    {
        DB::transaction(function () use ($request, $merchant): void {
            $before = $merchant->only(['name', 'mcc', 'mid', 'city', 'status']);

            $attributes = [];

            foreach (['name', 'mcc', 'mid', 'city'] as $field) {
                if ($request->has($field)) {
                    $attributes[$field] = $request->filled($field)
                        ? $request->string($field)->toString()
                        : null;
                }
            }

            if ($request->filled('status')) {
                $attributes['status'] = MerchantStatus::from($request->string('status')->toString());
            }

            $merchant->forceFill($attributes);

            if ($merchant->isDirty('status')) {
                $this->applyStatus($merchant, $request->user()?->getKey());
            }

            $merchant->save();

            $this->audit->record('merchant.updated', $merchant, $before, [
                'name' => $merchant->name,
                'mcc' => $merchant->mcc,
                'mid' => $merchant->mid,
                'city' => $merchant->city,
                'status' => $merchant->status->value,
            ]);
        });

        return new MerchantResource($merchant->refresh()->load('mccCode'));
    }

    public function verify(Request $request, Merchant $merchant): MerchantResource
    {
        Gate::authorize('verify', $merchant);

        if ($merchant->status === MerchantStatus::Verified) {
            return new MerchantResource($merchant->load('mccCode'));
        }

        DB::transaction(function () use ($request, $merchant): void {
            $before = ['status' => $merchant->status->value];

            $merchant->forceFill([
                'status' => MerchantStatus::Verified,
                'verified_at' => now(),
                'verified_by' => $request->user()?->getKey(),
            ])->save();

            $this->audit->record('merchant.verified', $merchant, $before, [
                'status' => $merchant->status->value,
                'verified_by' => $merchant->verified_by,
            ]);
        });

        return new MerchantResource($merchant->refresh()->load('mccCode'));
    }

    /**
     * System-issued QR for every verified merchant, so the demo page can show
     * the whole registry in one request instead of one call per merchant.
     */
    public function qrSheet(): JsonResponse
    {
        Gate::authorize('viewAny', Merchant::class);

        $merchants = Merchant::query()
            ->verified()
            ->with('mccCode')
            ->orderBy('name')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => $merchants->map(fn (Merchant $merchant): array => [
                'merchant' => new MerchantResource($merchant),
                'qr' => [
                    'payload' => $this->merchantQr->payload($merchant),
                    'image' => $this->merchantQr->image($merchant),
                ],
            ])->all(),
        ]);
    }

    /**
     * System-issued QR for the disbursement scan flow. Only verified merchants
     * get one; a pending or rejected merchant has nothing to scan into.
     */
    public function qr(Merchant $merchant): JsonResponse
    {
        Gate::authorize('view', $merchant);

        if ($merchant->status !== MerchantStatus::Verified) {
            throw ValidationException::withMessages([
                'merchant' => ['Merchant belum terverifikasi sehingga belum memiliki QR pencairan.'],
            ]);
        }

        $merchant->loadMissing('mccCode');

        return response()->json([
            'data' => [
                'merchant' => new MerchantResource($merchant),
                'qr' => [
                    'payload' => $this->merchantQr->payload($merchant),
                    'image' => $this->merchantQr->image($merchant),
                ],
            ],
        ]);
    }

    private function applyStatus(Merchant $merchant, ?int $actorId): void
    {
        if ($merchant->status === MerchantStatus::Verified) {
            $merchant->verified_at = $merchant->verified_at ?? now();
            $merchant->verified_by = $merchant->verified_by ?? $actorId;

            return;
        }

        $merchant->verified_at = null;
        $merchant->verified_by = null;
    }
}
