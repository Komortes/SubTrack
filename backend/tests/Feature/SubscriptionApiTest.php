<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SubscriptionApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receive_token(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'email' => 'user@example.com',
            'password' => 'password123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']]);
    }

    public function test_authenticated_user_can_create_list_update_renew_and_delete_subscription(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $create = $this->postJson('/api/subscriptions', $this->payload([
            'name' => 'Spotify',
            'amount' => 149,
            'renewal_date' => '2026-05-10',
        ]));

        $create
            ->assertCreated()
            ->assertJsonPath('name', 'Spotify')
            ->assertJsonPath('currency', 'CZK');

        $id = $create->json('id');

        $this->getJson('/api/subscriptions')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $id);

        $this->putJson("/api/subscriptions/{$id}", ['amount' => 199])
            ->assertOk()
            ->assertJsonPath('amount', '199.00');

        $this->postJson("/api/subscriptions/{$id}/renew")
            ->assertOk()
            ->assertJsonPath('renewal_date', '2026-06-10T00:00:00.000000Z');

        $this->deleteJson("/api/subscriptions/{$id}")->assertNoContent();
        $this->assertDatabaseMissing('subscriptions', ['id' => $id]);
    }

    public function test_analytics_summary_normalizes_subscription_periods(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        Subscription::query()->create($this->modelPayload($user, [
            'name' => 'Monthly',
            'amount' => 100,
            'billing_period' => 'monthly',
            'category' => 'work',
        ]));

        Subscription::query()->create($this->modelPayload($user, [
            'name' => 'Yearly',
            'amount' => 1200,
            'billing_period' => 'yearly',
            'category' => 'cloud',
        ]));

        $this->getJson('/api/analytics/summary')
            ->assertOk()
            ->assertJsonPath('monthly_total', 200)
            ->assertJsonPath('yearly_total', 2400)
            ->assertJsonPath('active_count', 2)
            ->assertJsonPath('by_category.work', 100)
            ->assertJsonPath('by_category.cloud', 100);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'name' => 'ChatGPT',
            'amount' => 499,
            'currency' => 'CZK',
            'billing_period' => 'monthly',
            'renewal_date' => '2026-05-04',
            'category' => 'work',
            'icon_slug' => 'chatgpt',
            'color' => '#111827',
            'notes' => null,
            'is_active' => true,
        ], $overrides);
    }

    private function modelPayload(User $user, array $overrides = []): array
    {
        return array_merge($this->payload(), ['user_id' => $user->id], $overrides);
    }
}

