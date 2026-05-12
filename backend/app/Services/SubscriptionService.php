<?php

namespace App\Services;

use App\Models\Subscription;
use Carbon\CarbonImmutable;

class SubscriptionService
{
    public function renew(Subscription $subscription): Subscription
    {
        $date = CarbonImmutable::parse($subscription->renewal_date);

        $subscription->paymentRecords()->create([
            'user_id' => $subscription->user_id,
            'paid_at' => now(),
            'amount' => $subscription->amount,
            'currency' => $subscription->currency,
        ]);

        $subscription->renewal_date = match ($subscription->billing_period) {
            'weekly' => $date->addWeek(),
            'yearly' => $date->addYear(),
            'custom' => $date->addDays((int) ($subscription->custom_period_days ?: 30)),
            default => $date->addMonthNoOverflow(),
        };

        $subscription->save();

        return $subscription->load(['paymentRecords' => fn ($query) => $query->limit(5)]);
    }

    public function monthlyAmount(Subscription $subscription): float
    {
        if (! $subscription->is_active) {
            return 0.0;
        }

        return match ($subscription->billing_period) {
            'weekly' => (float) $subscription->amount * 4.345,
            'yearly' => (float) $subscription->amount / 12,
            'custom' => (float) $subscription->amount * (30 / max(1, (int) $subscription->custom_period_days)),
            default => (float) $subscription->amount,
        };
    }
}
