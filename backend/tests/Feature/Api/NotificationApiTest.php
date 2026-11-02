<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use App\Mail\CampaignStateChangedMail;
use App\Models\Campaign;
use App\Models\User;
use Database\Seeders\MccCodeSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

final class NotificationApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MccCodeSeeder::class);
        Mail::fake();
    }

    private function approve(Campaign $campaign): void
    {
        Sanctum::actingAs(User::factory()->verifier()->create());

        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'approve',
        ])->assertOk();
    }

    public function test_approval_creates_an_in_app_row_and_queues_the_email(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->pendingReview()->create(['user_id' => $campaigner->id]);

        $this->approve($campaign);

        $this->assertDatabaseHas('notifications', [
            'notifiable_type' => User::class,
            'notifiable_id' => $campaigner->id,
            'read_at' => null,
        ]);

        $notification = $campaigner->notifications()->firstOrFail();

        $this->assertSame('campaign.state_changed', $notification->data['type']);
        $this->assertSame('active', $notification->data['status']);
        $this->assertSame($campaign->id, $notification->data['campaign_id']);

        Mail::assertQueued(
            CampaignStateChangedMail::class,
            fn (CampaignStateChangedMail $mail): bool => $mail->hasTo($campaigner->email)
                && $mail->campaign->is($campaign),
        );
    }

    public function test_rejection_notifies_the_owner_with_the_reason(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->pendingReview()->create(['user_id' => $campaigner->id]);

        Sanctum::actingAs(User::factory()->verifier()->create());
        $this->postJson("/api/v1/campaigns/{$campaign->id}/review", [
            'decision' => 'reject',
            'rejection_reason' => 'Deskripsi tidak jelas.',
        ])->assertOk();

        $notification = $campaigner->notifications()->firstOrFail();

        $this->assertSame('draft', $notification->data['status']);
        $this->assertSame('Deskripsi tidak jelas.', $notification->data['reason']);
        Mail::assertQueued(CampaignStateChangedMail::class, 1);
    }

    public function test_the_owner_can_list_and_mark_notifications_as_read(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->pendingReview()->create(['user_id' => $campaigner->id]);
        $this->approve($campaign);

        $notification = $campaigner->notifications()->firstOrFail();

        Sanctum::actingAs($campaigner);

        $this->getJson('/api/v1/notifications')
            ->assertOk()
            ->assertJsonPath('meta.unread_count', 1)
            ->assertJsonPath('data.0.id', $notification->id)
            ->assertJsonPath('data.0.read_at', null);

        $this->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertOk()
            ->assertJsonPath('id', $notification->id)
            ->assertJsonPath('data.status', 'active');

        $this->assertNotNull($notification->fresh()->read_at);

        $this->getJson('/api/v1/notifications?unread=1')
            ->assertOk()
            ->assertJsonCount(0, 'data')
            ->assertJsonPath('meta.unread_count', 0);
    }

    public function test_read_all_fills_read_at_for_every_unread_notification(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->pendingReview()->create(['user_id' => $campaigner->id]);
        $this->approve($campaign);

        $frozen = Campaign::factory()->active()->create(['user_id' => $campaigner->id]);

        Sanctum::actingAs(User::factory()->admin()->create());
        $this->postJson("/api/v1/campaigns/{$frozen->id}/freeze", [
            'reason' => 'Laporan penyalahgunaan dana.',
        ])->assertOk();

        $this->assertSame(2, $campaigner->unreadNotifications()->count());

        Sanctum::actingAs($campaigner);
        $this->postJson('/api/v1/notifications/read-all')
            ->assertOk()
            ->assertJsonPath('data.marked', 2)
            ->assertJsonPath('data.unread_count', 0);

        $this->assertSame(0, $campaigner->unreadNotifications()->count());
    }

    public function test_a_notification_belonging_to_someone_else_is_not_found(): void
    {
        $campaigner = User::factory()->campaigner()->create();
        $campaign = Campaign::factory()->pendingReview()->create(['user_id' => $campaigner->id]);
        $this->approve($campaign);

        $notification = $campaigner->notifications()->firstOrFail();

        Sanctum::actingAs(User::factory()->donor()->create());

        $this->postJson("/api/v1/notifications/{$notification->id}/read")
            ->assertNotFound();

        $this->assertNull($notification->fresh()->read_at);
    }

    public function test_the_inbox_requires_authentication(): void
    {
        $this->getJson('/api/v1/notifications')->assertUnauthorized();
    }
}
