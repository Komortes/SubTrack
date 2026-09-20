<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Log;

class RevenueCatWebhookController extends Controller
{
    /**
     * Entitlement identifier configured in RevenueCat that grants Pro access.
     */
    private const PRO_ENTITLEMENT = 'pro';

    /**
     * Event types that grant/refresh Pro access vs. revoke it.
     */
    private const GRANTING_EVENTS = ['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION'];

    private const REVOKING_EVENTS = ['CANCELLATION', 'EXPIRATION', 'BILLING_ISSUE'];

    public function handle(Request $request): Response
    {
        $secret = config('services.revenuecat.webhook_secret');

        // Refuse to process events until an operator has configured the shared
        // secret RevenueCat sends back in the Authorization header. Without this
        // check anyone could POST fake entitlement events and grant themselves Pro.
        if (! $secret || ! hash_equals($secret, (string) $request->header('Authorization'))) {
            Log::warning('Rejected RevenueCat webhook: missing or invalid Authorization header.');

            return response()->noContent(401);
        }

        $event = $request->input('event', []);
        $type = $event['type'] ?? null;
        $appUserId = $event['app_user_id'] ?? null;
        $entitlementIds = $event['entitlement_ids'] ?? [];

        if (! $type || ! $appUserId || ! in_array(self::PRO_ENTITLEMENT, $entitlementIds, true)) {
            return response()->noContent();
        }

        $user = User::query()
            ->where('revenuecat_app_user_id', (string) $appUserId)
            ->orWhere('id', (string) $appUserId)
            ->first();

        if (! $user) {
            Log::warning("RevenueCat webhook: no user found for app_user_id={$appUserId}");

            return response()->noContent();
        }

        if (in_array($type, self::GRANTING_EVENTS, true)) {
            $expiresAtMs = $event['expiration_at_ms'] ?? null;
            $user->is_pro = true;
            $user->pro_expires_at = $expiresAtMs ? CarbonImmutable::createFromTimestampMs($expiresAtMs) : null;
            $user->save();
        } elseif (in_array($type, self::REVOKING_EVENTS, true)) {
            $user->is_pro = false;
            $user->save();
        }

        return response()->noContent();
    }
}
