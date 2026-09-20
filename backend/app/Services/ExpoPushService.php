<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    /**
     * Returns true on success. Failures are logged rather than thrown so a
     * single bad token doesn't abort delivery to the rest of a batch.
     */
    public function send(string $token, string $title, string $body, array $data = []): bool
    {
        try {
            Http::post('https://exp.host/--/api/v2/push/send', [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
            ])->throw();

            return true;
        } catch (\Throwable $e) {
            Log::warning('Expo push delivery failed', ['token' => $token, 'error' => $e->getMessage()]);

            return false;
        }
    }
}
