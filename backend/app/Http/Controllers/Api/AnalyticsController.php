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
        return [
            'months' => [],
            'message' => 'Monthly analytics will be backed by payment history in the next step.',
        ];
    }
}

