import { useEffect } from "react";
import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SummaryCard } from "@/components/SummaryCard";
import { UpcomingList } from "@/components/UpcomingList";
import { daysUntil } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function HomeScreen() {
  const { monthlyTotal, yearlyTotal } = useAnalytics();
  const { activeSubscriptions, recentlyAdded } = useSubscriptions();
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncError = useSubscriptionStore((state) => state.syncError);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const refreshPendingSyncCount = useSubscriptionStore((state) => state.refreshPendingSyncCount);
  const today = activeSubscriptions.filter((item) => daysUntil(item.renewalDate) === 0);

  useEffect(() => {
    if (!isOfflineMode) {
      syncFromServer().catch(() => undefined);
      return;
    }

    refreshPendingSyncCount().catch(() => undefined);
  }, [isOfflineMode, refreshPendingSyncCount, syncFromServer]);

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-40 pt-16">
        <View>
          <Text className="text-3xl font-bold tracking-tight text-ink">SubTrack</Text>
          <Text className="mt-1 text-subtle">Обзор подписок и списаний</Text>
          {pendingSyncCount > 0 ? (
            <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold text-ink">Ожидает синхронизации: {pendingSyncCount}</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {isOfflineMode ? "Войди в аккаунт, чтобы отправить очередь." : "Можно повторить отправку вручную."}
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
        <SummaryCard monthlyTotal={monthlyTotal} yearlyTotal={yearlyTotal} />
        {today.length > 0 ? (
          <View className="rounded-2xl border border-danger/30 bg-danger/10 p-4">
            {today.map((item) => (
              <View key={item.id} className="flex-row items-center gap-3">
                <View className="h-2 w-2 rounded-full bg-danger" />
                <View className="flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-danger">Списание сегодня</Text>
                  <Text className="mt-0.5 text-sm text-subtle">{item.name} · {item.amount} {item.currency}</Text>
                </View>
                <AnimatedPressable className="rounded-xl border border-border bg-surface px-3 py-2" onPress={() => markPaid(item.id)}>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-ink">Оплачено</Text>
                </AnimatedPressable>
              </View>
            ))}
          </View>
        ) : null}
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Ближайшие списания</Text>
          <UpcomingList subscriptions={activeSubscriptions} />
        </View>
        <View>
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Недавно добавленные</Text>
          <View className="gap-3">
            {recentlyAdded.map((item, index) => (
              <FadeInView key={item.id} index={index}>
                <SubscriptionCard subscription={item} />
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
