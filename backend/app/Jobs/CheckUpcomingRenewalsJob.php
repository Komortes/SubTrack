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
        $currentTime = CarbonImmutable::now()->format('H:i');

        foreach ([3, 1, 0] as $offsetDays) {
            $date = CarbonImmutable::today()->addDays($offsetDays);

            Subscription::query()
                ->where('is_active', true)
                ->whereDate('renewal_date', $date)
                ->with(['user.pushTokens', 'user.settings'])
                ->chunkById(100, function ($subscriptions) use ($currentTime, $date, $offsetDays) {
                    foreach ($subscriptions as $subscription) {
                        $settings = $subscription->user->settings;
                        $enabled = match ($offsetDays) {
                            3 => $settings?->notify_three_days ?? true,
                            1 => $settings?->notify_one_day ?? true,
                            default => $settings?->notify_same_day ?? true,
                        };

                        if (! $enabled) {
                            continue;
                        }

                        $notificationTime = $settings?->notification_time
                            ? substr((string) $settings->notification_time, 0, 5)
                            : '09:00';

                        if ($notificationTime !== $currentTime) {
                            continue;
                        }

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
