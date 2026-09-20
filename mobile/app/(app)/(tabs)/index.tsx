import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsDark } from "@/hooks/useIsDark";
import { EmptyState } from "@/components/EmptyState";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { PaymentCalendar } from "@/components/PaymentCalendar";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SummaryCard } from "@/components/SummaryCard";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { UpcomingList } from "@/components/UpcomingList";
import { daysUntil } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function HomeScreen() {
  const { t } = useTranslation();
  const { monthlyTotal, yearlyTotal } = useAnalytics();
  const { subscriptions, activeSubscriptions, recentlyAdded } = useSubscriptions();
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncError = useSubscriptionStore((state) => state.syncError);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const refreshPendingSyncCount = useSubscriptionStore((state) => state.refreshPendingSyncCount);
  const attention = activeSubscriptions.filter((item) => daysUntil(item.renewalDate) <= 0).sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isOfflineMode) return;
    setIsRefreshing(true);
    try {
      await syncFromServer();
    } catch {
      // The store exposes a retryable sync state; keep pull-to-refresh settled.
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
    <ScreenTransition className="flex-1 bg-bg" replayOnFocus={false}>
      <ScrollView
        contentContainerClassName="gap-6 px-5"
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 160 }}
        refreshControl={
          !isOfflineMode ? <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={isDark ? "#fafafa" : "#0a0a0a"}
            progressBackgroundColor="#141414"
          /> : undefined
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
                  {isOfflineMode ? t("common.savedLocally") : isSyncing ? t("common.syncing") : t("common.waitingToSync")}
                </Text>
              </View>
              {!isOfflineMode ? (
                <AnimatedPressable
                  className="rounded-xl bg-accent px-3 py-2"
                  disabled={isSyncing}
                  onPress={() => syncFromServer().catch(() => undefined)}
                >
                  <Text className="text-xs font-bold uppercase tracking-widest text-bg">
                    {isSyncing ? t("common.syncing") : t("common.syncNow")}
                  </Text>
                </AnimatedPressable>
              ) : null}
            </View>
          ) : null}
          {syncError ? <Text accessibilityRole="alert" className="mt-2 text-sm font-medium text-danger">{t("home.syncError")} · {t("common.syncNeedsAttention")}</Text> : null}
        </View>
        {subscriptions.length === 0 ? <EmptyState icon="credit-card" title={t("home.noSubscriptions")} subtitle={t("home.emptyHint")}
          action={{ label: t("home.addFirst"), onPress: () => router.push("/(app)/(tabs)/subscriptions/new") }} /> : <>
        <SummaryCard monthlyTotal={monthlyTotal} yearlyTotal={yearlyTotal} />
        <PaymentCalendar subscriptions={activeSubscriptions} />
        {attention.length > 0 ? <View className="gap-3">
          <Text className="text-xs font-semibold uppercase tracking-widest text-danger">{t("home.overdueRenewals")}</Text>
          {attention.map((item) => <SubscriptionCard key={item.id} subscription={item} compact onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)} />)}
        </View> : null}
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">{t("home.upcomingRenewals")}</Text>
          <UpcomingList
            subscriptions={activeSubscriptions}
            onPress={(id) => router.push(`/(app)/(tabs)/subscriptions/${id}`)}
          />
        </View>
        {recentlyAdded.length > 0 ? <View>
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
        </View> : null}
        </>}
      </ScrollView>
        <AnimatedPressable accessibilityLabel={t("home.addFirst")} onPress={() => router.push("/(app)/(tabs)/subscriptions/new")}
          className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-accent" style={{ bottom: Math.max(insets.bottom, 16) + 88 }} scaleTarget={0.92}>
          <Text className="text-3xl font-light text-bg">+</Text>
        </AnimatedPressable>
    </ScreenTransition>
  );
}
