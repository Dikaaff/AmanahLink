<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;

final class FreezeCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        $campaign = $this->route('campaign');

        return $campaign instanceof Campaign
            && ($this->user()?->can('freeze', $campaign) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => 'Alasan pembekuan wajib diisi.',
        ];
    }
}
