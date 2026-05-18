<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\SocialIdentityVerifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $user = User::create([
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
        ]);

        return response()->json([
            'token' => $user->createToken('mobile')->plainTextToken,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! $user->password || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages(['email' => 'Invalid credentials.']);
        }

        return ['token' => $user->createToken('mobile')->plainTextToken, 'user' => $user];
    }

    public function social(Request $request, SocialIdentityVerifier $verifier)
    {
        $data = $request->validate([
            'provider' => ['required', 'in:google'],
            'id_token' => ['required', 'string'],
            'name' => ['nullable', 'string', 'max:120'],
        ]);

        $identity = $verifier->verify($data['provider'], $data['id_token']);

        if ($identity['provider_id'] === '' || $identity['email'] === '') {
            throw ValidationException::withMessages(['id_token' => 'Provider did not return a verified identity.']);
        }

        $providerColumn = "{$data['provider']}_id";
        $user = User::query()
            ->where($providerColumn, $identity['provider_id'])
            ->orWhere('email', $identity['email'])
            ->first();

        $attributes = [
            'email' => $identity['email'],
            $providerColumn => $identity['provider_id'],
            'email_verified_at' => $identity['email_verified'] ? now() : null,
        ];

        if (! empty($identity['name']) || ! empty($data['name'])) {
            $attributes['name'] = $identity['name'] ?? $data['name'];
        }

        if (! empty($identity['avatar_url'])) {
            $attributes['avatar_url'] = $identity['avatar_url'];
        }

        if ($user) {
            $user->forceFill(array_filter($attributes, fn ($value) => $value !== null))->save();
        } else {
            $user = User::create($attributes);
        }

        return response()->json([
            'token' => $user->createToken('mobile')->plainTextToken,
            'user' => $user,
        ], $user->wasRecentlyCreated ? 201 : 200);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->noContent();
    }

    public function me(Request $request)
    {
        $user = $request->user();
        $user->forceFill(['last_synced_at' => now()])->save();

        return $user;
    }

    public function destroyAccount(Request $request)
    {
        $request->user()->delete();

        return response()->noContent();
    }
}
