<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;

final class StoreDisbursementRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = Campaign::query()->find($this->integer('campaign_id'));

        return $campaign !== null
            && ($this->user()?->can('disburse', $campaign) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'campaign_id' => ['required', 'integer', 'exists:campaigns,id'],
            'merchant_id' => ['required', 'integer', 'exists:merchants,id'],
            'amount' => ['required', 'numeric', 'min:1', 'decimal:0,2'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'campaign_id.exists' => 'Kampanye tidak ditemukan.',
            'merchant_id.exists' => 'Merchant tidak ditemukan.',
            'amount.decimal' => 'Nominal maksimal 2 angka desimal.',
        ];
    }
}
