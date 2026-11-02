<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\MerchantStatus;
use App\Models\Merchant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateMerchantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $merchant = $this->route('merchant');

        return $merchant instanceof Merchant
            && ($this->user()?->can('update', $merchant) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $merchant = $this->route('merchant');
        $merchantId = $merchant instanceof Merchant ? $merchant->getKey() : null;

        return [
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'mcc' => [
                'sometimes',
                'required',
                'string',
                Rule::exists('mcc_codes', 'code')->where(
                    static fn ($query) => $query->where('is_active', true)->where('is_blocked', false),
                ),
            ],
            'mid' => [
                'sometimes',
                'required',
                'string',
                'max:64',
                Rule::unique('merchants', 'mid')->ignore($merchantId),
            ],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'status' => [
                'sometimes',
                'required',
                Rule::in(array_map(
                    static fn (MerchantStatus $status): string => $status->value,
                    MerchantStatus::cases(),
                )),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'mcc.exists' => 'Kode MCC tidak terdaftar atau diblokir platform.',
            'mid.unique' => 'Merchant ID sudah dipakai merchant lain.',
        ];
    }
}
