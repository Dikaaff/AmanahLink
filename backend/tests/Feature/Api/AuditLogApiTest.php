<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class AuditLogApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_read_audit_logs_newest_first(): void
    {
        $verifier = User::factory()->verifier()->create();

        $older = AuditLog::factory()->create([
            'action' => 'campaign.created',
            'actor_id' => $verifier->id,
            'created_at' => now()->subDay(),
        ]);

        $newer = AuditLog::factory()->create([
            'action' => 'campaign.approved',
            'actor_id' => $verifier->id,
            'created_at' => now(),
        ]);

        Sanctum::actingAs($verifier);

        $response = $this->getJson('/api/v1/audit-logs')
            ->assertOk()
            ->assertJsonStructure(['data', 'meta' => ['next_cursor']]);

        $this->assertSame($newer->id, $response->json('data.0.id'));
        $this->assertSame($older->id, $response->json('data.1.id'));
    }

    public function test_the_viewer_filters_by_actor_action_and_date_range(): void
    {
        $actor = User::factory()->admin()->create();

        AuditLog::factory()->create([
            'actor_id' => $actor->id,
            'action' => 'campaign.frozen',
            'created_at' => now()->subDays(2),
        ]);

        $match = AuditLog::factory()->create([
            'actor_id' => $actor->id,
            'action' => 'campaign.refunded',
            'created_at' => now(),
        ]);

        AuditLog::factory()->create([
            'actor_id' => null,
            'action' => 'campaign.refunded',
            'created_at' => now(),
        ]);

        Sanctum::actingAs($actor);

        $response = $this->getJson('/api/v1/audit-logs?'.http_build_query([
            'actor_id' => $actor->id,
            'action' => 'campaign.refunded',
            'from' => now()->subDay()->toDateString(),
            'to' => now()->toDateString(),
        ]))->assertOk();

        $this->assertCount(1, $response->json('data'));
        $this->assertSame($match->id, $response->json('data.0.id'));
    }

    public function test_a_campaigner_cannot_read_audit_logs(): void
    {
        Sanctum::actingAs(User::factory()->campaigner()->create());

        $this->getJson('/api/v1/audit-logs')->assertForbidden();
    }

    public function test_audit_rows_cannot_be_updated_or_deleted(): void
    {
        $log = AuditLog::factory()->create();

        Sanctum::actingAs(User::factory()->admin()->create());

        $this->putJson("/api/v1/audit-logs/{$log->id}", ['action' => 'palsu'])
            ->assertStatus(405)
            ->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');

        $this->deleteJson("/api/v1/audit-logs/{$log->id}")
            ->assertStatus(405)
            ->assertJsonPath('error.code', 'METHOD_NOT_ALLOWED');

        $this->assertDatabaseHas('audit_logs', ['id' => $log->id, 'action' => $log->action]);
    }
}
