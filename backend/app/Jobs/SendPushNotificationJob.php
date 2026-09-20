<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Models\Subscription;
use App\Services\ExpoPushService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Queue\Queueable;

class SendPushNotificationJob implements ShouldQueue
{
    use Queueable;

    public function __construct(
        private readonly string $subscriptionId,
        private readonly int $offsetDays,
        private readonly string $scheduledFor,
    ) {}

    public function handle(ExpoPushService $push): void
    {
        // Claim this (subscription, scheduled_for, offset_days) slot up front via
        // the unique index, before sending anything. If a prior attempt already
        // claimed it (including one that partially failed), this insert fails and
        // we bail out instead of re-sending duplicate pushes on retry.
        $subscription = Subscription::query()->with('user.pushTokens')->findOrFail($this->subscriptionId);

        try {
            $log = NotificationLog::create([
                'user_id' => $subscription->user_id,
                'subscription_id' => $subscription->id,
                'scheduled_for' => $this->scheduledFor,
                'offset_days' => $this->offsetDays,
                'sent_at' => null,
            ]);
        } catch (QueryException $e) {
            return;
        }

        if ($subscription->user->pushTokens->isEmpty()) {
            return;
        }

        $body = $this->offsetDays === 0
            ? "{$subscription->name} списывается сегодня."
            : "{$subscription->name} спишется через {$this->offsetDays} дн.";

        foreach ($subscription->user->pushTokens as $token) {
            $push->send($token->token, 'SubTrack', $body, [
                'type' => 'renewal',
                'subscriptionId' => $subscription->id,
                'subscription_id' => $subscription->id,
                'offsetDays' => $this->offsetDays,
                'offset_days' => $this->offsetDays,
            ]);
        }

        $log->update(['sent_at' => now()]);
    }
}
