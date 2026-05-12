<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class PushTokenController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'platform' => ['required', 'in:ios,android'],
        ]);

        return $request->user()->pushTokens()->updateOrCreate(
            ['token' => $data['token']],
            ['platform' => $data['platform']]
        );
    }

    public function destroy(Request $request)
    {
        $request->validate(['token' => ['required', 'string']]);
        $request->user()->pushTokens()->where('token', (string) $request->string('token'))->delete();

        return response()->noContent();
    }
}
