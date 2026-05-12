<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class UserSettingsController extends Controller
{
    public function show(Request $request)
    {
        return response()->json($request->user()->settings()->firstOrCreate([])->refresh());
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'notify_three_days' => ['sometimes', 'boolean'],
            'notify_one_day' => ['sometimes', 'boolean'],
            'notify_same_day' => ['sometimes', 'boolean'],
            'notification_time' => ['sometimes', 'date_format:H:i'],
            'primary_currency' => ['sometimes', 'in:CZK,EUR,USD'],
            'date_format' => ['sometimes', 'in:DD.MM.YYYY,MM/DD/YYYY,YYYY-MM-DD'],
            'theme' => ['sometimes', 'in:light,dark,system'],
        ]);

        $settings = $request->user()->settings()->firstOrCreate([])->refresh();
        $settings->update($data);

        return response()->json($settings->refresh());
    }
}
