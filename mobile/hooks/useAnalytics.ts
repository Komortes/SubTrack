import { useEffect, useMemo, useState } from "react";
import * as api from "@/lib/api";
import { convertMonthlyHistory } from "@/lib/analyticsHistory";
import i18next from "@/lib/i18n";
import { normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAuthStore } from "@/store/authStore";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export function useAnalytics() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const lastSyncedAt = useSubscriptionStore((state) => state.lastSyncedAt);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const subscriptionSyncError = useSubscriptionStore((state) => state.syncError);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const userId = useAuthStore((state) => state.userId);
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);
  const fetchRates = useCurrencyStore((state) => state.fetchRates);
  const [remoteHistory, setRemoteHistory] = useState<{
    userId: number | null;
    points: api.MonthlyAnalyticsPoint[];
    error: string | null;
  }>({ userId: null, points: [], error: null });

  // Fetch exchange rates on mount (respects 24h TTL internally)
  useEffect(() => {
    if (!isOfflineMode) fetchRates().catch(() => undefined);
  }, [fetchRates, isOfflineMode]);

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
    if (isOfflineMode || userId === null) {
      setRemoteHistory({ userId: null, points: [], error: null });
      return;
    }
    if (!lastSyncedAt || isSyncing || pendingSyncCount > 0 || subscriptionSyncError) return;

    let cancelled = false;
    const subscriptionsAtRequest = useSubscriptionStore.getState().subscriptions;
    const canAcceptResponse = () => {
      const auth = useAuthStore.getState();
      const current = useSubscriptionStore.getState();
      return !cancelled && !auth.isOfflineMode && auth.userId === userId
        && current.lastSyncedAt === lastSyncedAt && !current.isSyncing && current.pendingSyncCount === 0
        && !current.syncError && current.subscriptions === subscriptionsAtRequest;
    };

    api.fetchMonthlyAnalytics()
      .then((points) => {
        if (canAcceptResponse()) {
          setRemoteHistory({ userId, points, error: null });
        }
      })
      .catch((error) => {
        if (canAcceptResponse()) {
          setRemoteHistory({ userId, points: [], error: error instanceof Error ? error.message : i18next.t("common.error") });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isOfflineMode, userId, lastSyncedAt, isSyncing, pendingSyncCount, subscriptionSyncError]);

  const monthlyHistory = useMemo(() => {
    if (isOfflineMode || remoteHistory.userId !== userId) return [];
    return convertMonthlyHistory(remoteHistory.points, primaryCurrency, rates);
  }, [isOfflineMode, remoteHistory, userId, primaryCurrency, rates]);

  return {
    ...localAnalytics,
    monthlyHistory,
    analyticsError: !isOfflineMode && remoteHistory.userId === userId ? remoteHistory.error : null
  };
}
