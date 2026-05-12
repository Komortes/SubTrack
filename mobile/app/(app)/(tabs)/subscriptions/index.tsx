import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription, SubscriptionCategory } from "@/lib/types";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const filters: { label: string; value: "all" | "active" | "paused" | SubscriptionCategory }[] = [
  { label: "Все", value: "all" },
  { label: "Активные", value: "active" },
  { label: "Приостановленные", value: "paused" },
  { label: "Развлечения", value: "entertainment" },
  { label: "Работа", value: "work" },
  { label: "Облако", value: "cloud" },
  { label: "Здоровье", value: "health" },
  { label: "Другое", value: "other" }
];

const sortOptions = [
  { label: "Дата", value: "renewalDate" },
  { label: "Сумма", value: "amount" },
  { label: "Название", value: "name" },
  { label: "Добавлено", value: "createdAt" }
] as const;

export default function SubscriptionsScreen() {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("renewalDate");
  const [query, setQuery] = useState("");
  const { subscriptions } = useSubscriptions();
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);

  const filtered = useMemo(
    () => {
      const result = subscriptions.filter((item) => {
        const normalizedQuery = query.trim().toLowerCase();
        const matchesSearch =
          normalizedQuery.length === 0 ||
          item.name.toLowerCase().includes(normalizedQuery) ||
          item.notes?.toLowerCase().includes(normalizedQuery);

        if (!matchesSearch) return false;
        if (filter === "all") return true;
        if (filter === "active") return item.isActive;
        if (filter === "paused") return !item.isActive;
        return item.category === filter;
      });

      return [...result].sort((a, b) => {
        if (sort === "amount") return normalizeMonthlyAmount(b) - normalizeMonthlyAmount(a);
        if (sort === "name") return a.name.localeCompare(b.name);
        if (sort === "createdAt") return b.createdAt.localeCompare(a.createdAt);
        return a.renewalDate.localeCompare(b.renewalDate);
      });
    },
    [filter, query, sort, subscriptions]
  );

  const activeSortLabel = sortOptions.find((item) => item.value === sort)?.label ?? "Дата";

  function chooseSort() {
    Alert.alert(
      "Сортировка",
      "Выбери порядок списка",
      [
        ...sortOptions.map((item) => ({
          text: item.label,
          onPress: () => setSort(item.value)
        })),
        { text: "Отмена", style: "cancel" as const }
      ]
    );
  }

  const refresh = useCallback(() => {
    if (isOfflineMode) return;
    syncFromServer().catch(() => undefined);
  }, [isOfflineMode, syncFromServer]);

  function confirmDelete(subscription: Subscription, swipeable: SwipeableMethods) {
    Alert.alert("Удалить подписку?", `${subscription.name} будет удалена из списка.`, [
      { text: "Отмена", style: "cancel", onPress: () => swipeable.close() },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          swipeable.close();
          deleteSubscription(subscription.id).catch(() => undefined);
        }
      }
    ]);
  }

  function renderPauseAction(subscription: Subscription, swipeable: SwipeableMethods) {
    return (
      <View className="mr-3 w-28 overflow-hidden rounded-2xl bg-ink">
        <AnimatedPressable
          className="h-full flex-1 items-center justify-center px-3"
          onPress={() => {
            swipeable.close();
            updateSubscription(subscription.id, { isActive: !subscription.isActive }).catch(() => undefined);
          }}
        >
          <Text className="text-center text-xs font-bold uppercase tracking-widest text-bg">
            {subscription.isActive ? "Пауза" : "Вернуть"}
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  function renderDeleteAction(subscription: Subscription, swipeable: SwipeableMethods) {
    return (
      <View className="ml-3 w-28 overflow-hidden rounded-2xl border border-danger/30 bg-danger/15">
        <AnimatedPressable
          className="h-full flex-1 items-center justify-center px-3"
          onPress={() => confirmDelete(subscription, swipeable)}
        >
          <Text className="text-center text-xs font-bold uppercase tracking-widest text-danger">Удалить</Text>
        </AnimatedPressable>
      </View>
    );
  }

  function renderSubscription({ item, index }: { item: Subscription; index: number }) {
    return (
      <FadeInView index={index}>
        <ReanimatedSwipeable
          friction={2}
          leftThreshold={44}
          rightThreshold={44}
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={(_, __, swipeable) => renderPauseAction(item, swipeable)}
          renderRightActions={(_, __, swipeable) => renderDeleteAction(item, swipeable)}
        >
          <SubscriptionCard
            subscription={item}
            onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
          />
        </ReanimatedSwipeable>
      </FadeInView>
    );
  }

  const emptyTitle = subscriptions.length === 0 ? "Нет подписок" : "Ничего не найдено";
  const emptyCopy =
    subscriptions.length === 0
      ? "Добавь первую подписку через кнопку внизу."
      : "Попробуй другой поиск, фильтр или сортировку.";

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <FlatList
        className="flex-1 bg-bg"
        contentContainerClassName="px-5 pb-28 pt-16"
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={refresh}
            tintColor="#fafafa"
            progressBackgroundColor="#141414"
          />
        }
        renderItem={renderSubscription}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={
          <View className="mb-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-3xl font-bold tracking-tight text-ink">Подписки</Text>
                <Text className="mt-1 text-sm text-subtle">{filtered.length} из {subscriptions.length}</Text>
              </View>
              <AnimatedPressable
                className="min-h-10 flex-row items-center gap-1 rounded-xl border border-border bg-surface px-3"
                onPress={chooseSort}
              >
                <Text className="text-sm font-semibold text-ink">{activeSortLabel}</Text>
                <Text className="text-xs text-muted">↕</Text>
              </AnimatedPressable>
            </View>
            <View className="mt-5 rounded-2xl border border-border bg-surface px-4 py-3">
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Поиск по названию или заметкам"
                placeholderTextColor="#525252"
                className="text-base text-ink"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4">
              <View className="flex-row gap-2">
                {filters.map((item) => (
                  <AnimatedPressable
                    key={item.value}
                    className={`rounded-full border px-4 py-2 ${filter === item.value ? "border-ink bg-ink" : "border-border bg-surface"}`}
                    onPress={() => setFilter(item.value)}
                  >
                    <Text className={filter === item.value ? "font-semibold text-bg" : "font-semibold text-muted"}>
                      {item.label}
                    </Text>
                  </AnimatedPressable>
                ))}
              </View>
            </ScrollView>
            {isOfflineMode ? (
              <Text className="mt-3 text-xs font-medium text-muted">Офлайн: обновление с сервера недоступно.</Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <View className="rounded-2xl border border-border bg-surface p-5">
            <Text className="text-center font-semibold text-ink">{emptyTitle}</Text>
            <Text className="mt-1 text-center text-sm text-muted">{emptyCopy}</Text>
          </View>
        }
      />
    </ScreenTransition>
  );
}
