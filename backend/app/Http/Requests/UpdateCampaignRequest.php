<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        return $campaign instanceof Campaign
            && ($this->user()?->can('update', $campaign) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'min:5', 'max:150'],
            'description' => ['sometimes', 'string', 'min:50', 'max:5000'],
            'target_amount' => ['sometimes', 'numeric', 'min:10000', 'max:1000000000000', 'decimal:0,2'],
            'deadline_at' => ['sometimes', 'date', 'after:now'],
            'allowed_mcc_array' => ['sometimes', 'array', 'min:1', 'max:10'],
            'allowed_mcc_array.*' => [
                'string',
                'distinct',
                Rule::exists('mcc_codes', 'code')
                    ->where(fn ($query) => $query->where('is_active', true)->where('is_blocked', false)),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'allowed_mcc_array.*.exists' => 'Kode MCC tidak tersedia, nonaktif, atau diblokir.',
            'deadline_at.after' => 'Tenggat harus di masa depan.',
        ];
    }
}
