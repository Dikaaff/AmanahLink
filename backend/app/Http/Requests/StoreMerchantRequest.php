<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Merchant;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreMerchantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Merchant::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:150'],
            'mcc' => [
                'required',
                'string',
                Rule::exists('mcc_codes', 'code')->where(
                    static fn ($query) => $query->where('is_active', true)->where('is_blocked', false),
                ),
            ],
            'mid' => ['required', 'string', 'max:64', Rule::unique('merchants', 'mid')],
            'city' => ['nullable', 'string', 'max:80'],
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
