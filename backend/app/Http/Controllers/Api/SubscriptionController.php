<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subscription;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->subscriptions()->latest()->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateSubscription($request);

        return $request->user()->subscriptions()->create($data);
    }

    public function show(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);

        return $subscription;
    }

    public function update(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);
        $subscription->update($this->validateSubscription($request, partial: true));

        return $subscription;
    }

    public function destroy(Request $request, Subscription $subscription)
    {
        $this->authorizeUser($request, $subscription);
        $subscription->delete();

        return response()->noContent();
    }

    public function renew(Request $request, Subscription $subscription, SubscriptionService $service)
    {
        $this->authorizeUser($request, $subscription);

        return $service->renew($subscription);
    }

    private function validateSubscription(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'max:120'],
            'amount' => [$required, 'numeric', 'min:0'],
            'currency' => [$required, 'in:CZK,EUR,USD'],
            'billing_period' => [$required, 'in:weekly,monthly,yearly,custom'],
            'custom_period_days' => ['nullable', 'integer', 'min:1'],
            'renewal_date' => [$required, 'date'],
            'category' => [$required, 'in:entertainment,work,cloud,health,other'],
            'icon_slug' => ['nullable', 'string', 'max:80'],
            'color' => ['nullable', 'string', 'max:24'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }

    private function authorizeUser(Request $request, Subscription $subscription): void
    {
        abort_unless($subscription->user_id === $request->user()->id, 404);
    }
}

