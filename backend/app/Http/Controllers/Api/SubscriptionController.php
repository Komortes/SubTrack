<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SubscriptionController extends Controller
{
    /**
     * Mirrors the client-side free tier cap (see mobile FREE_SUBSCRIPTION_LIMIT).
     * Enforced server-side too so a modified/tampered client can't create
     * unlimited subscriptions without a Pro entitlement.
     */
    private const FREE_SUBSCRIPTION_LIMIT = 5;

    public function index(Request $request)
    {
        return $request->user()->subscriptions()->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateSubscription($request);
        $user = $request->user();

        return $user->getConnection()->transaction(function () use ($user, $data) {
            $user = $user->newQuery()->lockForUpdate()->findOrFail($user->id);

            // Offline retries may replay a create after its response was lost.
            if (isset($data['id'])) {
                $existing = $user->subscriptions()->find($data['id']);

                if ($existing) {
                    return $existing;
                }
            }

            if (! ($data['is_archived'] ?? false)) {
                $this->enforceFreeLimit($user);
            }

            return $user->subscriptions()->create($data);
        });
    }

    public function show(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);

        return $subscription->load(['paymentRecords' => fn ($query) => $query->limit(5)]);
    }

    public function update(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);
        $data = $this->validateSubscription($request, partial: true, subscriptionId: $subscription->id);
        $user = $request->user();

        return $user->getConnection()->transaction(function () use ($user, $subscription, $data) {
            $user = $user->newQuery()->lockForUpdate()->findOrFail($user->id);
            $subscription = $user->subscriptions()->lockForUpdate()->findOrFail($subscription->id);

            if ($subscription->is_archived && array_key_exists('is_archived', $data) && ! $data['is_archived']) {
                $this->enforceFreeLimit($user);
            }

            $subscription->update($data);

            return $subscription->load(['paymentRecords' => fn ($query) => $query->limit(5)]);
        });
    }

    public function destroy(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);
        $subscription->delete();

        return response()->noContent();
    }

    public function destroyAll(Request $request)
    {
        $request->user()->subscriptions()->delete();

        return response()->noContent();
    }

    public function renew(Request $request, Subscription $subscription, SubscriptionService $service)
    {
        $this->authorizeUser($request, $subscription);
        $data = $request->validate([
            'payment_id' => [
                'sometimes',
                'uuid',
                Rule::unique('payment_records', 'id')->whereNot('subscription_id', $subscription->id),
            ],
        ]);

        return $service->renew($subscription, $data['payment_id'] ?? null);
    }

    private function enforceFreeLimit(User $user): void
    {
        if (! $user->is_pro) {
            $activeCount = $user->subscriptions()->where('is_archived', false)->count();

            abort_if($activeCount >= self::FREE_SUBSCRIPTION_LIMIT, 402, 'Free plan subscription limit reached.');
        }
    }

    private function validateSubscription(Request $request, bool $partial = false, ?string $subscriptionId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';
        $idRule = $partial
            ? ['sometimes', 'uuid', Rule::in([$subscriptionId])]
            : ['sometimes', 'uuid', Rule::unique('subscriptions', 'id')->whereNot('user_id', $request->user()->id)];

        return $request->validate([
            'id' => $idRule,
            'name' => [$required, 'string', 'max:120'],
            'amount' => [$required, 'numeric', 'min:0', 'max:9999999999.99'],
            'currency' => [$required, 'in:CZK,EUR,USD,GBP,CHF,PLN,HUF,JPY,CAD,AUD,SEK,NOK,DKK'],
            'billing_period' => [$required, 'in:weekly,monthly,yearly,custom'],
            'custom_period_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'renewal_date' => [$required, 'date'],
            'category' => [$required, 'in:entertainment,work,cloud,health,other'],
            'icon_slug' => ['nullable', 'string', 'max:80'],
            'color' => ['nullable', 'string', 'max:24'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'is_trial' => ['sometimes', 'boolean'],
            'is_archived' => ['sometimes', 'boolean'],
            'cancel_reminder_days' => ['nullable', 'integer', 'in:1,2,3,7'],
        ]);
    }

    private function authorizeUser(Request $request, Subscription $subscription): void
    {
        abort_unless($subscription->user_id === $request->user()->id, 404);
    }
}
