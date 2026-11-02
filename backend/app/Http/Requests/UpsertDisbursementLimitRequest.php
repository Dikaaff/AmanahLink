<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;

final class UpsertDisbursementLimitRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        return $campaign instanceof Campaign
            && ($this->user()?->can('manageLimits', $campaign) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'daily_limit' => ['required', 'numeric', 'min:1000', 'decimal:0,2'],
            'monthly_limit' => ['required', 'numeric', 'gte:daily_limit', 'decimal:0,2'],
            'expires_at' => ['required', 'date', 'after:now'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'monthly_limit.gte' => 'Limit bulanan tidak boleh lebih kecil dari limit harian.',
            'expires_at.after' => 'Masa berlaku limit harus di masa depan.',
        ];
    }
}
