<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;

final class ScanMerchantRequest extends FormRequest
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
            'amount' => ['required', 'numeric', 'min:1', 'decimal:0,2'],
            'qr' => ['required', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'campaign_id.exists' => 'Kampanye tidak ditemukan.',
            'amount.min' => 'Nominal pembayaran minimal Rp1.',
            'qr.required' => 'Pindai atau tempel kode QR merchant terlebih dahulu.',
        ];
    }
}
