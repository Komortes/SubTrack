<?php

namespace App\Services;

use App\Models\Subscription;
use Carbon\CarbonImmutable;

class SubscriptionService
{
    public function renew(Subscription $subscription, ?string $paymentId = null): Subscription
    {
        return $subscription->getConnection()->transaction(function () use ($subscription, $paymentId) {
            $subscription = $subscription->newQuery()->lockForUpdate()->findOrFail($subscription->id);

            if ($paymentId !== null && $subscription->paymentRecords()->whereKey($paymentId)->exists()) {
                return $subscription->load(['paymentRecords' => fn ($query) => $query->limit(5)]);
            }

            $date = CarbonImmutable::parse($subscription->renewal_date);

            $payment = $subscription->paymentRecords()->make([
                'user_id' => $subscription->user_id,
                'paid_at' => now(),
                'amount' => $subscription->amount,
                'currency' => $subscription->currency,
            ]);
            if ($paymentId !== null) {
                $payment->id = $paymentId;
            }
            $payment->save();

            $subscription->renewal_date = match ($subscription->billing_period) {
                'weekly' => $date->addWeek(),
                'yearly' => $date->addYearNoOverflow(),
                'custom' => $date->addDays((int) ($subscription->custom_period_days ?: 30)),
                default => $date->addMonthNoOverflow(),
            };

            $subscription->save();

            return $subscription->load(['paymentRecords' => fn ($query) => $query->limit(5)]);
        });
    }

    public function monthlyAmount(Subscription $subscription): float
    {
        if (! $subscription->is_active) {
            return 0.0;
        }

        return match ($subscription->billing_period) {
            'weekly' => (float) $subscription->amount * 4.345,
            'yearly' => (float) $subscription->amount / 12,
            'custom' => (float) $subscription->amount * (30 / max(1, (int) ($subscription->custom_period_days ?: 30))),
            default => (float) $subscription->amount,
        };
    }
}
