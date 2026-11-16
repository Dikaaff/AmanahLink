<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The admin role itself is never assignable from the console: promoting someone
 * to admin is a deployment/ownership decision, not an in-app click (S5).
 */
final class UpdateUserRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-users') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'role' => [
                'required',
                Rule::in([
                    UserRole::Donor->value,
                    UserRole::Campaigner->value,
                    UserRole::Verifier->value,
                ]),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'role.in' => 'Peran hanya dapat diubah ke donatur, penggalang, atau verifikator.',
        ];
    }
}
