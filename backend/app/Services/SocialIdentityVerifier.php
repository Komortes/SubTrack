<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Validation\ValidationException;

class SocialIdentityVerifier
{
    public function verify(string $provider, string $idToken): array
    {
        return match ($provider) {
            'google' => $this->verifyGoogle($idToken),
            default => throw ValidationException::withMessages(['provider' => 'Unsupported provider.']),
        };
    }

    private function verifyGoogle(string $idToken): array
    {
        $response = Http::timeout(5)->get('https://oauth2.googleapis.com/tokeninfo', [
            'id_token' => $idToken,
        ]);

        if (! $response->ok()) {
            throw ValidationException::withMessages(['id_token' => 'Invalid Google token.']);
        }

        $payload = $response->json();
        $this->assertAudience($payload['aud'] ?? null, config('services.google.client_ids'), 'Google');

        return [
            'provider_id' => (string) ($payload['sub'] ?? ''),
            'email' => strtolower((string) ($payload['email'] ?? '')),
            'name' => $payload['name'] ?? null,
            'avatar_url' => $payload['picture'] ?? null,
            'email_verified' => filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOL),
        ];
    }

    private function assertAudience(?string $audience, array $allowed, string $provider): void
    {
        if ($audience && $allowed !== [] && in_array($audience, $allowed, true)) {
            return;
        }

        if ($allowed === []) {
            throw ValidationException::withMessages([
                'id_token' => "{$provider} client id is not configured.",
            ]);
        }

        throw ValidationException::withMessages(['id_token' => "Invalid {$provider} token audience."]);
    }
}
