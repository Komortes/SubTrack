<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AnalyticsService;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    public function summary(Request $request, AnalyticsService $analytics)
    {
        return $analytics->summary($request->user()->subscriptions()->get());
    }

    public function monthly(Request $request)
    {
        $start = now()->startOfMonth()->subMonths(11);
        $records = $request->user()
            ->paymentRecords()
            ->where('paid_at', '>=', $start)
            ->get()
            ->groupBy(fn ($record) => $record->paid_at->format('Y-m'));

        return [
            'months' => collect(range(11, 0))
                ->map(function (int $offset) use ($records) {
                    $month = now()->startOfMonth()->subMonths($offset);
                    $key = $month->format('Y-m');
                    $monthRecords = $records->get($key, collect());

                    return [
                        'key' => $key,
                        'label' => $month->isoFormat('MMM'),
                        'total' => round((float) $monthRecords->sum('amount'), 2),
                        'totals_by_currency' => (object) $monthRecords
                            ->groupBy('currency')
                            ->map(fn ($payments) => round((float) $payments->sum('amount'), 2))
                            ->all(),
                    ];
                })
                ->values(),
        ];
    }
}
