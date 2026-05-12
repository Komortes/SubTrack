import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, Pressable, RefreshControl, SectionList, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import ReanimatedSwipeable, { type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { EmptyState } from "@/components/EmptyState";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { categoryLabels } from "@/lib/catalog";
import { haptic } from "@/lib/haptics";
import { daysUntil, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription, SubscriptionCategory } from "@/lib/types";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const filters: { label: string; value: "all" | "active" | "paused" | SubscriptionCategory }[] = [
  { label: "Все", value: "all" },
  { label: "Активные", value: "active" },
  { label: "Пауза", value: "paused" },
  { label: "Развлечения", value: "entertainment" },
  { label: "Работа", value: "work" },
  { label: "Облако", value: "cloud" },
  { label: "Здоровье", value: "health" },
  { label: "Другое", value: "other" }
];

const sortOptions = [
  { label: "По дате", value: "renewalDate" },
  { label: "По сумме", value: "amount" },
  { label: "По названию", value: "name" },
  { label: "По дате добавления", value: "createdAt" }
] as const;

type GroupMode = "none" | "category" | "date";

const SWIPE_THRESHOLD = 0.42;

function SwipeLeftAction({
  progress,
  isActive,
  onPress,
}: {
  progress: SharedValue<number>;
  isActive: boolean;
  onPress: () => void;
}) {
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, SWIPE_THRESHOLD, 1],
      ["#1a1a1a", "#1a1a1a", "#2e2e2e"]
    ),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, SWIPE_THRESHOLD, 1], [0.9, 0.9, 1.15]) }],
    opacity: interpolate(progress.value, [0, SWIPE_THRESHOLD, 1], [0.4, 0.4, 1]),
  }));
  return (
    <View style={{ marginRight: 10, width: 72, borderRadius: 16, overflow: "hidden" }}>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, bgStyle]}>
        <Pressable style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }} onPress={onPress}>
          <Animated.View style={iconStyle}>
            <Feather name={isActive ? "pause" : "play"} size={20} color="#fafafa" />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SwipeRightAction({ progress, onPress }: { progress: SharedValue<number>; onPress: () => void }) {
  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, SWIPE_THRESHOLD, 1],
      ["rgba(239,68,68,0.06)", "rgba(239,68,68,0.06)", "rgba(239,68,68,0.22)"]
    ),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(progress.value, [0, SWIPE_THRESHOLD, 1], [0.9, 0.9, 1.15]) }],
    opacity: interpolate(progress.value, [0, SWIPE_THRESHOLD, 1], [0.4, 0.4, 1]),
  }));
  return (
    <View style={{ marginLeft: 10, width: 72, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" }}>
      <Animated.View style={[{ flex: 1, alignItems: "center", justifyContent: "center" }, bgStyle]}>
        <Pressable style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "center" }} onPress={onPress}>
          <Animated.View style={iconStyle}>
            <Feather name="trash-2" size={20} color="#ef4444" />
          </Animated.View>
        </Pressable>
      </Animated.View>
    </View>
  );
}

function SubscriptionRow({
  item,
  compact,
  onDelete,
  onToggle,
  onPress,
}: {
  item: Subscription;
  compact: boolean;
  onDelete: (item: Subscription, swipeable: SwipeableMethods) => void;
  onToggle: (item: Subscription, swipeable: SwipeableMethods) => void;
  onPress: () => void;
}) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const isOpenRef = useRef(false);
  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1.3}
      leftThreshold={44}
      rightThreshold={44}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={() => { isOpenRef.current = true; }}
      onSwipeableClose={() => { isOpenRef.current = false; }}
      renderLeftActions={(progress, _, swipeable) => (
        <SwipeLeftAction progress={progress} isActive={item.isActive} onPress={() => onToggle(item, swipeable)} />
      )}
      renderRightActions={(progress, _, swipeable) => (
        <SwipeRightAction progress={progress} onPress={() => onDelete(item, swipeable)} />
      )}
    >
      <SubscriptionCard
        subscription={item}
        compact={compact}
        onPress={() => {
          if (isOpenRef.current) {
            swipeableRef.current?.close();
          } else {
            onPress();
          }
        }}
      />
    </ReanimatedSwipeable>
  );
}

function groupByCategory(items: Subscription[]): { title: string; data: Subscription[] }[] {
  const map = new Map<string, Subscription[]>();
  for (const item of items) {
    const key = item.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .map(([key, data]) => ({ title: categoryLabels[key as SubscriptionCategory] ?? key, data }))
    .sort((a, b) => b.data.length - a.data.length);
}

function groupByDate(items: Subscription[]): { title: string; data: Subscription[] }[] {
  const thisWeek: Subscription[] = [];
  const thisMonth: Subscription[] = [];
  const later: Subscription[] = [];
  for (const item of items) {
    const d = daysUntil(item.renewalDate);
    if (d <= 7) thisWeek.push(item);
    else if (d <= 30) thisMonth.push(item);
    else later.push(item);
  }
  return [
    { title: "На этой неделе", data: thisWeek },
    { title: "В этом месяце", data: thisMonth },
    { title: "Позже", data: later },
  ].filter((s) => s.data.length > 0);
}

export default function SubscriptionsScreen() {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [sort, setSort] = useState<(typeof sortOptions)[number]["value"]>("renewalDate");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const { subscriptions } = useSubscriptions();
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);

  const filtered = useMemo(() => {
    const result = subscriptions.filter((item) => {
      const q = query.trim().toLowerCase();
      const matchesSearch = !q || item.name.toLowerCase().includes(q) || item.notes?.toLowerCase().includes(q);
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
  }, [filter, query, sort, subscriptions]);

  const sections = useMemo(() => {
    if (groupMode === "category") return groupByCategory(filtered);
    if (groupMode === "date") return groupByDate(filtered);
    return [{ title: "", data: filtered }];
  }, [filtered, groupMode]);

  const activeSortLabel = sortOptions.find((i) => i.value === sort)?.label ?? "По дате";

  function chooseSort() {
    Alert.alert("Сортировка", "Выбери порядок списка", [
      ...sortOptions.map((item) => ({
        text: sort === item.value ? `✓ ${item.label}` : item.label,
        onPress: () => setSort(item.value)
      })),
      { text: "Отмена", style: "cancel" as const }
    ]);
  }

  function chooseGroup() {
    Alert.alert("Группировка", undefined, [
      { text: groupMode === "none" ? "✓ Без группировки" : "Без группировки", onPress: () => setGroupMode("none") },
      { text: groupMode === "category" ? "✓ По категории" : "По категории", onPress: () => setGroupMode("category") },
      { text: groupMode === "date" ? "✓ По дате" : "По дате", onPress: () => setGroupMode("date") },
      { text: "Отмена", style: "cancel" as const }
    ]);
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
          haptic.warning();
          swipeable.close();
          deleteSubscription(subscription.id).catch(() => undefined);
        }
      }
    ]);
  }

  function renderItem({ item }: { item: Subscription }) {
    return (
      <SubscriptionRow
        item={item}
        compact={compact}
        onDelete={confirmDelete}
        onToggle={(sub, swipeable) => {
          swipeable.close();
          updateSubscription(sub.id, { isActive: !sub.isActive }).catch(() => undefined);
        }}
        onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
      />
    );
  }

  const header = (
    <View className="mb-5">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-3xl font-bold tracking-tight text-ink">Подписки</Text>
          <Text className="mt-1 text-sm text-subtle">{filtered.length} из {subscriptions.length}</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <AnimatedPressable
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface"
            onPress={() => setCompact((v) => !v)}
          >
            <Feather name={compact ? "grid" : "list"} size={15} color="#a3a3a3" />
          </AnimatedPressable>
          <AnimatedPressable
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface"
            onPress={chooseGroup}
          >
            <Feather name="layers" size={15} color={groupMode !== "none" ? "#fafafa" : "#a3a3a3"} />
          </AnimatedPressable>
          <AnimatedPressable
            className="flex-row items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2"
            onPress={chooseSort}
          >
            <Feather name="sliders" size={13} color="#a3a3a3" />
            <Text className="text-xs font-medium text-subtle">{activeSortLabel}</Text>
          </AnimatedPressable>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <Feather name="search" size={16} color="#525252" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Поиск по названию или заметкам"
          placeholderTextColor="#525252"
          className="flex-1 text-base text-ink"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 ? (
          <AnimatedPressable onPress={() => setQuery("")}>
            <Feather name="x" size={16} color="#525252" />
          </AnimatedPressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
        <View className="flex-row gap-2">
          {filters.map((item) => (
            <AnimatedPressable
              key={item.value}
              className={`rounded-full border px-3 py-1.5 ${filter === item.value ? "border-ink bg-ink" : "border-border bg-surface"}`}
              onPress={() => setFilter(item.value)}
            >
              <Text className={`text-xs font-medium ${filter === item.value ? "text-bg" : "text-muted"}`}>
                {item.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </ScrollView>

      {isOfflineMode ? (
        <Text className="mt-3 text-xs font-medium text-muted">Офлайн: обновление с сервера недоступно.</Text>
      ) : null}

      <RefreshIndicator visible={isSyncing} />
    </View>
  );

  const emptyComponent = (
    <EmptyState
      icon={subscriptions.length === 0 ? "credit-card" : "search"}
      title={subscriptions.length === 0 ? "Нет подписок" : "Ничего не найдено"}
      subtitle={
        subscriptions.length === 0
          ? "Добавь первую подписку через кнопку + внизу экрана."
          : "Попробуй изменить поиск, фильтр или сортировку."
      }
      action={
        subscriptions.length === 0
          ? { label: "Добавить подписку", onPress: () => router.push("/(app)/(tabs)/subscriptions/new") }
          : undefined
      }
    />
  );

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <SectionList
        className="flex-1 bg-bg"
        contentContainerClassName="px-5 pb-36 pt-16"
        sections={sections}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={refresh}
            tintColor="#fafafa"
            progressBackgroundColor="#141414"
          />
        }
        renderItem={renderItem}
        renderSectionHeader={({ section }) =>
          section.title ? (
            <Text className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted">
              {section.title}
            </Text>
          ) : null
        }
        SectionSeparatorComponent={() => null}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyComponent}
      />

      <Link href="/(app)/(tabs)/subscriptions/new" asChild>
        <AnimatedPressable
          className="absolute bottom-28 right-5 h-16 w-16 items-center justify-center rounded-full bg-accent"
          scaleTarget={0.92}
        >
          <Text className="text-3xl font-light text-bg">+</Text>
        </AnimatedPressable>
      </Link>
    </ScreenTransition>
  );
}
