<?php

namespace Tests\Feature;

use App\Jobs\SendPushNotificationJob;
use App\Models\NotificationLog;
use App\Models\Subscription;
use App\Models\User;
use App\Services\ExpoPushService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SendPushNotificationJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_failed_token_does_not_stop_delivery_to_other_tokens(): void
    {
        Http::fake([
            'exp.host/*' => Http::sequence()
                ->push(['data' => ['status' => 'error']], 400)
                ->push(['data' => ['status' => 'ok']], 200),
        ]);

        $user = User::factory()->create();
        $user->pushTokens()->create(['token' => 'ExponentPushToken[bad]', 'platform' => 'ios']);
        $user->pushTokens()->create(['token' => 'ExponentPushToken[good]', 'platform' => 'ios']);
        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'name' => 'Spotify',
            'amount' => 100,
            'currency' => 'CZK',
            'billing_period' => 'monthly',
            'renewal_date' => '2026-05-10',
            'category' => 'work',
            'is_active' => true,
        ]);

        (new SendPushNotificationJob($subscription->id, 0, '2026-05-10'))->handle(app(ExpoPushService::class));

        Http::assertSentCount(2);
        $this->assertDatabaseHas('notification_logs', [
            'subscription_id' => $subscription->id,
            'offset_days' => 0,
        ]);
    }

    public function test_job_does_not_resend_when_notification_already_claimed(): void
    {
        Http::fake();

        $user = User::factory()->create();
        $user->pushTokens()->create(['token' => 'ExponentPushToken[test]', 'platform' => 'ios']);
        $subscription = Subscription::query()->create([
            'user_id' => $user->id,
            'name' => 'Spotify',
            'amount' => 100,
            'currency' => 'CZK',
            'billing_period' => 'monthly',
            'renewal_date' => '2026-05-10',
            'category' => 'work',
            'is_active' => true,
        ]);

        NotificationLog::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'scheduled_for' => '2026-05-10',
            'offset_days' => 0,
            'sent_at' => null,
        ]);

        (new SendPushNotificationJob($subscription->id, 0, '2026-05-10'))->handle(app(ExpoPushService::class));

        Http::assertNothingSent();
    }
}
