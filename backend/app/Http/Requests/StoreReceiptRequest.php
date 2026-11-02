<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Models\Transaction;
use Illuminate\Foundation\Http\FormRequest;

final class StoreReceiptRequest extends FormRequest
{
    public function authorize(): bool
    {
        $transaction = $this->route('transaction');

        return $transaction instanceof Transaction
            && ($this->user()?->can('uploadReceipt', $transaction) ?? false);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $maxKilobytes = intdiv((int) config('amanahlink.receipt_max_bytes'), 1024);

        return [
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:'.$maxKilobytes],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Berkas nota wajib diunggah.',
            'file.mimes' => 'Nota harus berupa JPEG atau PNG.',
            'file.max' => 'Ukuran nota melebihi batas yang diizinkan.',
        ];
    }
}
