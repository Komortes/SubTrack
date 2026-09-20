<?php

namespace Tests\Feature;

use App\Models\Subscription;
use App\Models\User;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use RuntimeException;
use Tests\TestCase;

class SubscriptionServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_yearly_renewal_clamps_leap_day_to_february_end(): void
    {
        $subscription = $this->subscription([
            'billing_period' => 'yearly',
            'renewal_date' => '2024-02-29',
        ]);

        $renewed = app(SubscriptionService::class)->renew($subscription);

        $this->assertSame('2025-02-28', $renewed->renewal_date->toDateString());
        $this->assertCount(1, $renewed->paymentRecords);
    }

    public function test_custom_period_without_days_uses_thirty_days_for_analytics_and_renewal(): void
    {
        $subscription = $this->subscription([
            'billing_period' => 'custom',
            'custom_period_days' => null,
        ]);
        $service = app(SubscriptionService::class);

        $this->assertSame(120.0, $service->monthlyAmount($subscription));
        $this->assertSame('2026-02-09', $service->renew($subscription)->renewal_date->toDateString());
    }

    public function test_renewal_uses_the_current_saved_date_for_stale_model_instances(): void
    {
        $subscription = $this->subscription();
        $stale = $subscription->fresh();
        $service = app(SubscriptionService::class);

        $service->renew($subscription);
        $renewed = $service->renew($stale);

        $this->assertSame('2026-03-10', $renewed->renewal_date->toDateString());
        $this->assertDatabaseCount('payment_records', 2);
    }

    public function test_renewal_rolls_back_payment_when_date_update_fails(): void
    {
        $subscription = $this->subscription();
        $event = 'eloquent.updating: '.Subscription::class;
        Event::listen($event, function () {
            throw new RuntimeException('Simulated date update failure');
        });

        try {
            app(SubscriptionService::class)->renew($subscription);
            $this->fail('The date update should fail.');
        } catch (RuntimeException $exception) {
            $this->assertSame('Simulated date update failure', $exception->getMessage());
        } finally {
            Event::forget($event);
        }

        $this->assertDatabaseCount('payment_records', 0);
        $this->assertSame('2026-01-10', $subscription->fresh()->renewal_date->toDateString());
    }

    private function subscription(array $overrides = []): Subscription
    {
        return Subscription::query()->create(array_merge([
            'user_id' => User::factory()->create()->id,
            'name' => 'Calendar subscription',
            'amount' => 120,
            'currency' => 'CZK',
            'billing_period' => 'monthly',
            'renewal_date' => '2026-01-10',
            'category' => 'work',
            'is_active' => true,
        ], $overrides));
    }
}
