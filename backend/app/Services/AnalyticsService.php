<?php

namespace App\Services;

use App\Models\Subscription;
use Illuminate\Support\Collection;

class AnalyticsService
{
    public function __construct(private readonly SubscriptionService $subscriptions) {}

    public function summary(Collection $subscriptions): array
    {
        $active = $subscriptions->where('is_active', true)->where('is_archived', false);
        $monthlyTotal = $active->sum(fn (Subscription $subscription) => $this->subscriptions->monthlyAmount($subscription));

        return [
            'monthly_total' => round($monthlyTotal, 2),
            'yearly_total' => round($monthlyTotal * 12, 2),
            'active_count' => $active->count(),
            'by_category' => $active
                ->groupBy('category')
                ->map(fn (Collection $items) => round($items->sum(fn (Subscription $item) => $this->subscriptions->monthlyAmount($item)), 2))
                ->all(),
        ];
    }
}
