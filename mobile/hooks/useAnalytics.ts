import { useMemo } from "react";
import { normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export function useAnalytics() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  return useMemo(() => {
    const active = subscriptions.filter((item) => item.isActive);
    const monthlyTotal = active.reduce((sum, item) => sum + normalizeMonthlyAmount(item), 0);
    const byCategory = active.reduce<Record<string, number>>((result, item) => {
      result[item.category] = (result[item.category] ?? 0) + normalizeMonthlyAmount(item);
      return result;
    }, {});

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      activeCount: active.length,
      byCategory,
      topSubscriptions: [...active].sort(
        (a, b) => normalizeMonthlyAmount(b) - normalizeMonthlyAmount(a)
      )
    };
  }, [subscriptions]);
}

