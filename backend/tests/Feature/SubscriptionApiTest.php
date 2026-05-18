<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Jobs\CheckUpcomingRenewalsJob;
use App\Jobs\SendPushNotificationJob;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
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

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $user = User::factory()->create(['email' => 'profile@example.com']);
        Sanctum::actingAs($user);

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', 'profile@example.com');
    }

    public function test_user_can_login_with_google_identity_token(): void
    {
        config(['services.google.client_ids' => ['google-client-id']]);
        Http::fake([
            'oauth2.googleapis.com/tokeninfo*' => Http::response([
                'sub' => 'google-user-123',
                'aud' => 'google-client-id',
                'email' => 'google@example.com',
                'email_verified' => 'true',
                'name' => 'Google User',
                'picture' => 'https://example.com/avatar.png',
            ]),
        ]);

        $this->postJson('/api/auth/social', [
            'provider' => 'google',
            'id_token' => 'google-id-token',
        ])
            ->assertCreated()
            ->assertJsonStructure(['token', 'user' => ['id', 'email']])
            ->assertJsonPath('user.email', 'google@example.com');

        $this->assertDatabaseHas('users', [
            'email' => 'google@example.com',
            'google_id' => 'google-user-123',
            'name' => 'Google User',
        ]);
    }

    public function test_authenticated_user_can_delete_account(): void
    {
        $user = User::factory()->create(['email' => 'delete@example.com']);
        Sanctum::actingAs($user);

        Subscription::query()->create($this->modelPayload($user, ['name' => 'Spotify']));

        $this->deleteJson('/api/account')->assertNoContent();

        $this->assertDatabaseMissing('users', ['id' => $user->id]);
        $this->assertDatabaseMissing('subscriptions', ['user_id' => $user->id]);
    }

    public function test_authenticated_user_can_register_and_delete_push_token(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->postJson('/api/push-tokens', [
            'token' => 'ExponentPushToken[test]',
            'platform' => 'ios',
        ])
            ->assertCreated()
            ->assertJsonPath('token', 'ExponentPushToken[test]');

        $this->assertDatabaseHas('push_tokens', [
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[test]',
            'platform' => 'ios',
        ]);

        $this->deleteJson('/api/push-tokens', ['token' => 'ExponentPushToken[test]'])
            ->assertNoContent();

        $this->assertDatabaseMissing('push_tokens', [
            'user_id' => $user->id,
            'token' => 'ExponentPushToken[test]',
        ]);
    }

    public function test_authenticated_user_can_create_list_update_renew_and_delete_subscription(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $clientId = '018f9a5d-8d71-77d2-8f7b-628e71dfb3d9';

        $create = $this->postJson('/api/subscriptions', $this->payload([
            'id' => $clientId,
            'name' => 'Spotify',
            'amount' => 149,
            'renewal_date' => '2026-05-10',
        ]));

        $create
            ->assertCreated()
            ->assertJsonPath('id', $clientId)
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
            ->assertJsonPath('renewal_date', '2026-06-10T00:00:00.000000Z')
            ->assertJsonCount(1, 'payment_records')
            ->assertJsonPath('payment_records.0.amount', '199.00');

        $this->assertDatabaseHas('payment_records', [
            'subscription_id' => $id,
            'amount' => 199,
            'currency' => 'CZK',
        ]);

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

    public function test_user_can_read_and_update_settings(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/settings')
            ->assertOk()
            ->assertJsonPath('notify_three_days', true)
            ->assertJsonPath('primary_currency', 'CZK')
            ->assertJsonPath('theme', 'system');

        $this->putJson('/api/settings', [
            'notify_one_day' => false,
            'notification_time' => '08:30',
            'primary_currency' => 'EUR',
            'theme' => 'dark',
        ])
            ->assertOk()
            ->assertJsonPath('notify_one_day', false)
            ->assertJsonPath('notification_time', '08:30')
            ->assertJsonPath('primary_currency', 'EUR')
            ->assertJsonPath('theme', 'dark');
    }

    public function test_authenticated_user_can_delete_all_subscriptions(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        Subscription::query()->create($this->modelPayload($user, ['name' => 'Spotify']));
        Subscription::query()->create($this->modelPayload($user, ['name' => 'Netflix']));

        $this->deleteJson('/api/subscriptions')->assertNoContent();

        $this->assertDatabaseMissing('subscriptions', ['user_id' => $user->id]);
    }

    public function test_monthly_analytics_returns_payment_totals(): void
    {
        CarbonImmutable::setTestNow('2026-05-07 12:00:00');
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $subscription = Subscription::query()->create($this->modelPayload($user, ['amount' => 250]));
        $subscription->paymentRecords()->create([
            'user_id' => $user->id,
            'paid_at' => '2026-05-01 10:00:00',
            'amount' => 250,
            'currency' => 'CZK',
        ]);
        $subscription->paymentRecords()->create([
            'user_id' => $user->id,
            'paid_at' => '2026-04-01 10:00:00',
            'amount' => 100,
            'currency' => 'CZK',
        ]);

        $this->getJson('/api/analytics/monthly')
            ->assertOk()
            ->assertJsonCount(12, 'months')
            ->assertJsonPath('months.10.key', '2026-04')
            ->assertJsonPath('months.10.total', 100)
            ->assertJsonPath('months.11.key', '2026-05')
            ->assertJsonPath('months.11.total', 250);

        CarbonImmutable::setTestNow();
    }

    public function test_notification_checker_respects_settings_time_and_dedupe(): void
    {
        Queue::fake();
        CarbonImmutable::setTestNow('2026-05-07 09:00:00');
        $user = User::factory()->create();
        $user->settings()->create([
            'notify_three_days' => true,
            'notify_one_day' => false,
            'notify_same_day' => true,
            'notification_time' => '09:00',
        ]);
        $user->pushTokens()->create([
            'token' => 'ExponentPushToken[test]',
            'platform' => 'ios',
        ]);

        $threeDays = Subscription::query()->create($this->modelPayload($user, [
            'name' => 'Three Days',
            'renewal_date' => '2026-05-10',
        ]));
        Subscription::query()->create($this->modelPayload($user, [
            'name' => 'One Day Disabled',
            'renewal_date' => '2026-05-08',
        ]));
        $today = Subscription::query()->create($this->modelPayload($user, [
            'name' => 'Today',
            'renewal_date' => '2026-05-07',
        ]));
        $today->notificationLogs()->create([
            'user_id' => $user->id,
            'scheduled_for' => '2026-05-07',
            'offset_days' => 0,
            'sent_at' => now(),
        ]);

        (new CheckUpcomingRenewalsJob())->handle();

        Queue::assertPushed(SendPushNotificationJob::class, 1);
        Queue::assertPushed(SendPushNotificationJob::class, function (SendPushNotificationJob $job) use ($threeDays) {
            return serialize($job) !== '' && str_contains(serialize($job), $threeDays->id);
        });

        CarbonImmutable::setTestNow('2026-05-07 08:59:00');
        (new CheckUpcomingRenewalsJob())->handle();
        Queue::assertPushed(SendPushNotificationJob::class, 1);

        CarbonImmutable::setTestNow();
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
