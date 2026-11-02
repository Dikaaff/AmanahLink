<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Donation;
use Illuminate\Foundation\Http\FormRequest;

final class StoreDonationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Donation::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
            'amount' => [
                'required',
                'numeric',
                'min:'.config('amanahlink.min_donation'),
                'max:'.config('amanahlink.max_donation'),
                'decimal:0,2',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'campaign_id.exists' => 'Kampanye tidak ditemukan.',
            'amount.decimal' => 'Nominal maksimal 2 angka desimal.',
        ];
    }
}
