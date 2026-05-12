import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export function useAnalytics() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const [remoteSummary, setRemoteSummary] = useState<api.AnalyticsSummary | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<api.MonthlyAnalyticsPoint[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const localAnalytics = useMemo(() => {
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

  useEffect(() => {
    if (isOfflineMode) {
      setRemoteSummary(null);
      setMonthlyHistory([]);
      setAnalyticsError(null);
      return;
    }

    let cancelled = false;

    Promise.all([api.fetchAnalyticsSummary(), api.fetchMonthlyAnalytics()])
      .then(([summary, monthly]) => {
        if (!cancelled) {
          setRemoteSummary(summary);
          setMonthlyHistory(monthly);
          setAnalyticsError(null);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAnalyticsError(error instanceof Error ? error.message : "Не удалось загрузить аналитику");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOfflineMode, subscriptions.length]);

  return {
    ...localAnalytics,
    ...(remoteSummary ?? {}),
    monthlyHistory,
    analyticsError
  };
}
