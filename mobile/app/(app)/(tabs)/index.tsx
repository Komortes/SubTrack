import { useCallback, useEffect, useState } from "react";
import { Link, router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SummaryCard } from "@/components/SummaryCard";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { UpcomingList } from "@/components/UpcomingList";
import { daysUntil } from "@/lib/subscriptionMath";
import { haptic } from "@/lib/haptics";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { monthlyTotal, yearlyTotal, monthlyHistory } = useAnalytics();
  const { activeSubscriptions, recentlyAdded } = useSubscriptions();
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncError = useSubscriptionStore((state) => state.syncError);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const refreshPendingSyncCount = useSubscriptionStore((state) => state.refreshPendingSyncCount);
  const today = activeSubscriptions.filter((item) => daysUntil(item.renewalDate) === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Compute trend vs previous month from history (null when no data)
  const trend: number | null = (() => {
    if (monthlyHistory.length < 2) return null;
    const prev = monthlyHistory[monthlyHistory.length - 2]?.total;
    if (!prev || prev === 0) return null;
    return ((monthlyTotal - prev) / prev) * 100;
  })();

  const refresh = useCallback(async () => {
    if (isOfflineMode) return;
    setIsRefreshing(true);
    try {
      await syncFromServer();
    } finally {
      setIsRefreshing(false);
    }
  }, [isOfflineMode, syncFromServer]);

  useEffect(() => {
    if (!isOfflineMode) {
      syncFromServer().catch(() => undefined);
      return;
    }

    refreshPendingSyncCount().catch(() => undefined);
  }, [isOfflineMode, refreshPendingSyncCount, syncFromServer]);

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-40 pt-16"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor="#fafafa"
            progressBackgroundColor="#141414"
          />
        }
      >
        <View>
          <RefreshIndicator visible={isRefreshing} />
          <Text className="text-3xl font-bold tracking-tight text-ink">{t("home.title")}</Text>
          <Text className="mt-1 text-subtle">{t("home.upcomingRenewals")}</Text>
          {pendingSyncCount > 0 ? (
            <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-ink">{t("common.inQueue", { count: pendingSyncCount })}</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {isOfflineMode ? t("settings.rows.offlineModeSubtitle") : t("common.syncing")}
                </Text>
              </View>
              {!isOfflineMode ? (
                <AnimatedPressable
                  className="rounded-xl bg-accent px-3 py-2"
                  disabled={isSyncing}
                  onPress={() => syncFromServer().catch(() => undefined)}
                >
                  <Text className="text-xs font-bold uppercase tracking-widest text-bg">
                    {isSyncing ? "..." : "Sync"}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
          {syncError ? <Text className="mt-2 text-sm font-medium text-danger">{syncError}</Text> : null}
        </View>
        <SummaryCard monthlyTotal={monthlyTotal} yearlyTotal={yearlyTotal} trend={trend} />
        <PaymentCalendar subscriptions={activeSubscriptions} />
        {today.length > 0 ? (
          <View className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
            {today.map((item) => (
              <View key={item.id} className="flex-row items-center gap-3">
                <View className="h-2 w-2 rounded-full bg-danger" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-danger">{t("home.todayRenewals")}</Text>
                  <Text className="mt-0.5 text-sm text-subtle">{item.name} · {item.amount} {item.currency}</Text>
                </View>
                <AnimatedPressable className="rounded-xl border border-border bg-surface px-3 py-2" onPress={() => { haptic.success(); markPaid(item.id); }}>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-ink">{t("subscriptions.detail.markPaid")}</Text>
                </AnimatedPressable>
              </View>
            ))}
          </View>
        ) : null}
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{t("home.upcomingRenewals")}</Text>
          <UpcomingList
            subscriptions={activeSubscriptions}
            onPress={(id) => router.push(`/(app)/(tabs)/subscriptions/${id}`)}
          />
        </View>
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{t("home.recentlyAdded")}</Text>
          <View className="gap-3">
            {recentlyAdded.map((item, index) => (
              <FadeInView key={item.id} index={index}>
                <SubscriptionCard
                  subscription={item}
                  onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
                />
              </FadeInView>
            ))}
          </View>
        </View>
      </ScrollView>
      <Link href="/(app)/(tabs)/subscriptions/new" asChild>
        <AnimatedPressable className="absolute bottom-28 right-5 h-16 w-16 items-center justify-center rounded-full bg-accent" scaleTarget={0.92}>
          <Text className="text-3xl font-light text-bg">+</Text>
        </AnimatedPressable>
      </Link>
    </ScreenTransition>
  );
}
