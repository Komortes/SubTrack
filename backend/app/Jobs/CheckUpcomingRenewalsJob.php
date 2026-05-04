<?php

namespace App\Jobs;

use App\Models\NotificationLog;
use App\Models\Subscription;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class CheckUpcomingRenewalsJob implements ShouldQueue
{
    use Queueable;

    public function handle(): void
    {
        foreach ([3, 1, 0] as $offsetDays) {
            $date = CarbonImmutable::today()->addDays($offsetDays);

            Subscription::query()
                ->where('is_active', true)
                ->whereDate('renewal_date', $date)
                ->with('user.pushTokens')
                ->chunkById(100, function ($subscriptions) use ($date, $offsetDays) {
                    foreach ($subscriptions as $subscription) {
                        $exists = NotificationLog::query()
                            ->where('subscription_id', $subscription->id)
                            ->whereDate('scheduled_for', $date)
                            ->where('offset_days', $offsetDays)
                            ->exists();

                        if ($exists) {
                            continue;
                        }

                        SendPushNotificationJob::dispatch($subscription->id, $offsetDays, $date->toDateString());
                    }
                });
        }
    }
}

