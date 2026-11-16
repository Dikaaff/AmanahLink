<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * P8 S5 — the admin manages access, not money. These tests pin the account
 * lifecycle rules: suspension is effective immediately, the admin role cannot
 * be granted from the console, and no admin can lock itself out.
 */
final class AdminUserManagementApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_an_admin_can_manage_users(): void
    {
        foreach ([
            User::factory()->donor()->create(),
            User::factory()->campaigner()->create(),
            User::factory()->verifier()->create(),
        ] as $user) {
            Sanctum::actingAs($user);

            $this->getJson('/api/v1/admin/users')->assertForbidden();
        }
    }

    public function test_the_admin_can_filter_users_by_role_status_and_query(): void
    {
        $donor = User::factory()->donor()->create(['name' => 'Siti Aminah']);
        User::factory()->campaigner()->create();
        $suspended = User::factory()->donor()->create(['name' => 'Akun Ditahan']);
        $suspended->forceFill(['suspended_at' => now()])->save();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->getJson('/api/v1/admin/users?role=donor')
            ->assertOk()
            ->assertJsonPath('meta.total', 2);

        $this->getJson('/api/v1/admin/users?status=suspended')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.id', $suspended->id);

        $this->getJson('/api/v1/admin/users?q=Siti')
            ->assertOk()
            ->assertJsonPath('data.0.id', $donor->id);
    }

    public function test_suspending_a_user_blocks_login_tokens_and_requests(): void
    {
        $donor = User::factory()->donor()->create();
        $donor->createToken('api');
        $admin = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/users/{$donor->id}/suspend", [
            'reason' => 'Laporan penyalahgunaan akun donatur.',
        ])->assertOk()
            ->assertJsonPath('data.is_suspended', true);

        $this->assertSame(0, $donor->tokens()->count());
        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.suspended',
            'subject_id' => $donor->id,
        ]);

        Sanctum::actingAs($donor->refresh());

        $this->getJson('/api/v1/auth/me')
            ->assertForbidden()
            ->assertJsonPath('error.code', 'ACCOUNT_SUSPENDED');

        $this->postJson('/api/v1/auth/login', [
            'email' => $donor->email,
            'password' => 'password',
        ])
            ->assertForbidden()
            ->assertJsonPath('error.code', 'ACCOUNT_SUSPENDED');
    }

    public function test_reactivating_a_user_restores_access(): void
    {
        $donor = User::factory()->donor()->create();
        $donor->forceFill(['suspended_at' => now()])->save();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->postJson("/api/v1/admin/users/{$donor->id}/reactivate")
            ->assertOk()
            ->assertJsonPath('data.is_suspended', false);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.reactivated',
            'subject_id' => $donor->id,
        ]);

        $this->postJson('/api/v1/auth/login', [
            'email' => $donor->email,
            'password' => 'password',
        ])->assertOk();
    }

    public function test_an_admin_cannot_suspend_itself_or_another_admin(): void
    {
        $admin = User::factory()->admin()->create();
        $peer = User::factory()->admin()->create();

        Sanctum::actingAs($admin);

        $this->postJson("/api/v1/admin/users/{$admin->id}/suspend", [
            'reason' => 'Mencoba menangguhkan diri sendiri.',
        ])->assertForbidden();

        $this->postJson("/api/v1/admin/users/{$peer->id}/suspend", [
            'reason' => 'Mencoba menangguhkan admin lain.',
        ])->assertForbidden();
    }

    public function test_an_admin_can_change_a_non_admin_role_and_it_is_audited(): void
    {
        $donor = User::factory()->donor()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/v1/admin/users/{$donor->id}/role", [
            'role' => 'verifier',
        ])->assertOk()
            ->assertJsonPath('data.role', 'verifier');

        $this->assertDatabaseHas('users', [
            'id' => $donor->id,
            'role' => UserRole::Verifier->value,
        ]);

        $this->assertDatabaseHas('audit_logs', [
            'action' => 'user.role_changed',
            'subject_id' => $donor->id,
        ]);
    }

    public function test_the_admin_role_cannot_be_granted_or_edited_from_the_console(): void
    {
        $donor = User::factory()->donor()->create();
        $peer = User::factory()->admin()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->patchJson("/api/v1/admin/users/{$donor->id}/role", [
            'role' => 'admin',
        ])->assertUnprocessable();

        $this->patchJson("/api/v1/admin/users/{$peer->id}/role", [
            'role' => 'verifier',
        ])->assertForbidden();

        $this->patchJson("/api/v1/admin/users/{$donor->id}/role", [
            'role' => 'donor',
        ])->assertOk();
    }
}
