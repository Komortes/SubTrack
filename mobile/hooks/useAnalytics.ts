import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import i18next from "@/lib/i18n";
import { normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAuthStore } from "@/store/authStore";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export function useAnalytics() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);
  const fetchRates = useCurrencyStore((state) => state.fetchRates);
  const [remoteSummary, setRemoteSummary] = useState<api.AnalyticsSummary | null>(null);
  const [monthlyHistory, setMonthlyHistory] = useState<api.MonthlyAnalyticsPoint[]>([]);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Fetch exchange rates on mount (respects 24h TTL internally)
  useEffect(() => {
    fetchRates().catch(() => undefined);
  }, [fetchRates]);

  const localAnalytics = useMemo(() => {
    const active = subscriptions.filter((item) => item.isActive && !item.isArchived);

    function toMonthlyPrimary(subscription: typeof active[number]): number {
      const monthly = normalizeMonthlyAmount(subscription);
      return convertAmount(monthly, subscription.currency, primaryCurrency, rates);
    }

    const monthlyTotal = active.reduce((sum, item) => sum + toMonthlyPrimary(item), 0);
    const byCategory = active.reduce<Record<string, number>>((result, item) => {
      result[item.category] = (result[item.category] ?? 0) + toMonthlyPrimary(item);
      return result;
    }, {});

    return {
      monthlyTotal,
      yearlyTotal: monthlyTotal * 12,
      activeCount: active.length,
      byCategory,
      topSubscriptions: [...active].sort(
        (a, b) => toMonthlyPrimary(b) - toMonthlyPrimary(a)
      )
    };
  }, [subscriptions, primaryCurrency, rates]);

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
          setAnalyticsError(error instanceof Error ? error.message : i18next.t("common.error"));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOfflineMode, subscriptions.length]);

  // Remote summary from server is always in the server's base currency — use local analytics instead
  // since only local analytics can do per-subscription currency conversion properly
  return {
    ...localAnalytics,
    monthlyHistory,
    analyticsError
  };
}
