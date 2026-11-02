<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Campaign;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreCampaignRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Campaign::class) ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:5', 'max:150'],
            'description' => ['required', 'string', 'min:50', 'max:5000'],
            'target_amount' => ['required', 'numeric', 'min:10000', 'max:1000000000000', 'decimal:0,2'],
            'deadline_at' => ['required', 'date', 'after:now'],
            'allowed_mcc_array' => ['required', 'array', 'min:1', 'max:10'],
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
            'title.min' => 'Judul kampanye minimal 5 karakter.',
            'description.min' => 'Deskripsi minimal 50 karakter agar donatur memahami tujuan dana.',
            'target_amount.min' => 'Target dana minimal Rp 10.000,00.',
            'target_amount.decimal' => 'Nominal maksimal 2 angka desimal.',
            'deadline_at.after' => 'Tenggat harus di masa depan.',
            'allowed_mcc_array.*.exists' => 'Kode MCC tidak tersedia, nonaktif, atau diblokir.',
        ];
    }
}
