<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RevenueCatWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_is_rejected_without_a_valid_authorization_header(): void
    {
        config(['services.revenuecat.webhook_secret' => 'expected-secret']);
        $user = User::factory()->create();

        $this->postJson('/api/webhooks/revenuecat', [
            'event' => [
                'type' => 'INITIAL_PURCHASE',
                'app_user_id' => (string) $user->id,
                'entitlement_ids' => ['pro'],
            ],
        ], ['Authorization' => 'wrong-secret'])->assertStatus(401);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_pro' => false]);
    }

    public function test_webhook_is_rejected_when_secret_is_not_configured(): void
    {
        config(['services.revenuecat.webhook_secret' => null]);
        $user = User::factory()->create();

        $this->postJson('/api/webhooks/revenuecat', [
            'event' => [
                'type' => 'INITIAL_PURCHASE',
                'app_user_id' => (string) $user->id,
                'entitlement_ids' => ['pro'],
            ],
        ], ['Authorization' => ''])->assertStatus(401);
    }

    public function test_webhook_grants_pro_on_initial_purchase(): void
    {
        config(['services.revenuecat.webhook_secret' => 'expected-secret']);
        $user = User::factory()->create();

        $this->postJson('/api/webhooks/revenuecat', [
            'event' => [
                'type' => 'INITIAL_PURCHASE',
                'app_user_id' => (string) $user->id,
                'entitlement_ids' => ['pro'],
                'expiration_at_ms' => now()->addYear()->getTimestampMs(),
            ],
        ], ['Authorization' => 'expected-secret'])->assertNoContent();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_pro' => true]);
    }

    public function test_webhook_revokes_pro_on_expiration(): void
    {
        config(['services.revenuecat.webhook_secret' => 'expected-secret']);
        $user = User::factory()->create(['is_pro' => true]);

        $this->postJson('/api/webhooks/revenuecat', [
            'event' => [
                'type' => 'EXPIRATION',
                'app_user_id' => (string) $user->id,
                'entitlement_ids' => ['pro'],
            ],
        ], ['Authorization' => 'expected-secret'])->assertNoContent();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_pro' => false]);
    }

    public function test_webhook_ignores_events_for_unknown_entitlements(): void
    {
        config(['services.revenuecat.webhook_secret' => 'expected-secret']);
        $user = User::factory()->create();

        $this->postJson('/api/webhooks/revenuecat', [
            'event' => [
                'type' => 'INITIAL_PURCHASE',
                'app_user_id' => (string) $user->id,
                'entitlement_ids' => ['some_other_entitlement'],
            ],
        ], ['Authorization' => 'expected-secret'])->assertNoContent();

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_pro' => false]);
    }
}
