<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Tighter limit than the default `api` throttle, keyed by IP + email so a
        // single attacker can't credential-stuff/brute-force login or register.
        RateLimiter::for('auth', function ($request) {
            $email = (string) $request->input('email', '');

            return Limit::perMinute(10)->by($request->ip().'|'.$email);
        });
    }
}
