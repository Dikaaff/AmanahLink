<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Receipt;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class ReviewReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        $receipt = $this->route('receipt');

        return $receipt instanceof Receipt
            && ($this->user()?->can('review', $receipt) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'decision' => ['required', Rule::in(['approve', 'reject'])],
            'rejection_reason' => ['required_if:decision,reject', 'nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'decision.in' => 'Keputusan harus "approve" atau "reject".',
            'rejection_reason.required_if' => 'Alasan penolakan wajib diisi.',
        ];
    }
}
