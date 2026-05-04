<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Models\Subscription;
use App\Services\ExpoPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SendPushNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $subscriptionId,
        private readonly int $offsetDays,
        private readonly string $scheduledFor,
    ) {
    }

    public function handle(ExpoPushService $push): void
    {
        $subscription = Subscription::query()->with('user.pushTokens')->findOrFail($this->subscriptionId);
        $body = $this->offsetDays === 0
            ? "{$subscription->name} списывается сегодня."
            : "{$subscription->name} спишется через {$this->offsetDays} дн.";

        foreach ($subscription->user->pushTokens as $token) {
            $push->send($token->token, 'SubTrack', $body, [
                'subscription_id' => $subscription->id,
                'offset_days' => $this->offsetDays,
            ]);
        }

        NotificationLog::create([
            'user_id' => $subscription->user_id,
            'subscription_id' => $subscription->id,
            'scheduled_for' => $this->scheduledFor,
            'offset_days' => $this->offsetDays,
            'sent_at' => now(),
        ]);
    }
}

