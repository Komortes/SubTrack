import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, LayoutChangeEvent, RefreshControl, SectionList, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { DURATION, EASING } from "@/utils/animations";
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { EmptyState } from "@/components/EmptyState";
import { FadeInView } from "@/components/FadeInView";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { haptic } from "@/lib/haptics";
import { daysUntil, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription, SubscriptionCategory } from "@/lib/types";
import { useIsDark } from "@/hooks/useIsDark";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useProStatus } from "@/hooks/useProStatus";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore, FREE_SUBSCRIPTION_LIMIT } from "@/store/subscriptionStore";
import i18next from "@/lib/i18n";

type SortValue = "renewalDate" | "amount" | "name" | "createdAt";
type FilterValue = "all" | "active" | "paused" | SubscriptionCategory;
type GroupMode = "none" | "category" | "date";

const SWIPE_THRESHOLD = 0.42;

function SwipeLeftAction({
  progress,
  isActive,
}: {
  progress: SharedValue<number>;
  isActive: boolean;
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
        <Animated.View style={[iconStyle, { flex: 1, alignItems: "center", justifyContent: "center" }]}>
          <Feather name={isActive ? "pause" : "play"} size={20} color="#fafafa" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function SwipeRightAction({ progress }: { progress: SharedValue<number> }) {
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
        <Animated.View style={[iconStyle, { flex: 1, alignItems: "center", justifyContent: "center" }]}>
          <Feather name="trash-2" size={20} color="#ef4444" />
        </Animated.View>
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
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.RIGHT) {
          swipeableRef.current?.close();
          onToggle(item, swipeableRef.current!);
        } else {
          onDelete(item, swipeableRef.current!);
        }
      }}
      renderLeftActions={(progress) => (
        <SwipeLeftAction progress={progress} isActive={item.isActive} />
      )}
      renderRightActions={(progress) => (
        <SwipeRightAction progress={progress} />
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
    .map(([key, data]) => ({ title: i18next.t(`categories.${key}`, key), data }))
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
    { title: i18next.t("subscriptions.groups.date"), data: thisWeek },
    { title: i18next.t("subscriptions.groups.date"), data: thisMonth },
    { title: i18next.t("subscriptions.groups.none"), data: later },
  ].filter((s) => s.data.length > 0);
}

export default function SubscriptionsScreen() {
  const { t } = useTranslation();

  const filters: { label: string; value: FilterValue }[] = [
    { label: t("subscriptions.filters.all"), value: "all" },
    { label: t("subscriptions.filters.active"), value: "active" },
    { label: t("subscriptions.filters.paused"), value: "paused" },
    { label: t("categories.entertainment"), value: "entertainment" },
    { label: t("categories.work"), value: "work" },
    { label: t("categories.cloud"), value: "cloud" },
    { label: t("categories.health"), value: "health" },
    { label: t("categories.other"), value: "other" },
  ];

  const sortOptions: { label: string; value: SortValue }[] = [
    { label: t("subscriptions.sort.renewalDate"), value: "renewalDate" },
    { label: t("subscriptions.sort.amount"), value: "amount" },
    { label: t("subscriptions.sort.name"), value: "name" },
    { label: t("subscriptions.sort.createdAt"), value: "createdAt" },
  ];

  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("renewalDate");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // sliding pill for primary filter tabs
  const pillX = useSharedValue(0);
  const [tabWidth, setTabWidth] = useState(0);
  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));
  const handleTabsLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width / 3;
    setTabWidth(w);
    const idx = primaryFilters.findIndex((p) => p.value === filter);
    pillX.value = (idx >= 0 ? idx : 0) * w;
  };

  // advanced filters animated opacity/height
  const filterPanelOpacity = useSharedValue(0);
  const filterPanelStyle = useAnimatedStyle(() => ({ opacity: filterPanelOpacity.value }));
  const { subscriptions: activeSubscriptions, archivedSubscriptions } = useSubscriptions();
  const subscriptions = showArchived ? archivedSubscriptions : activeSubscriptions;
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);
  const isPro = useProStatus();
  const isDark = useIsDark();
  const pillColor = isDark ? "#fafafa" : "#0a0a0a";
  const allSubscriptions = useSubscriptionStore((s) => s.subscriptions);
  const nonArchivedCount = allSubscriptions.filter((s) => !s.isArchived).length;

  function handleAddPress() {
    if (!isPro && nonArchivedCount >= FREE_SUBSCRIPTION_LIMIT) {
      router.push("/(app)/paywall");
      return;
    }
    router.push("/(app)/(tabs)/subscriptions/new");
  }

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

  const activeSortLabel = sortOptions.find((i) => i.value === sort)?.label ?? t("subscriptions.sort.renewalDate");
  const activeCount = subscriptions.filter((item) => item.isActive).length;
  const pausedCount = subscriptions.length - activeCount;
  const dueSoonCount = subscriptions.filter((item) => { const d = daysUntil(item.renewalDate); return item.isActive && d >= 0 && d <= 7; }).length;
  const categoryFilters = filters.filter((item) => !["all", "active", "paused"].includes(String(item.value)));
  const primaryFilters = filters.filter((item) => ["all", "active", "paused"].includes(String(item.value)));

  function setFilterAndAnimatePill(value: FilterValue) {
    setFilter(value);
    const idx = primaryFilters.findIndex((p) => p.value === value);
    if (idx >= 0 && tabWidth > 0) {
      pillX.value = withTiming(idx * tabWidth, { duration: DURATION.fast, easing: EASING.out, reduceMotion: ReduceMotion.System });
    }
  }

  function toggleAdvancedFilters() {
    const next = !showAdvancedFilters;
    setShowAdvancedFilters(next);
    filterPanelOpacity.value = withTiming(next ? 1 : 0, { duration: DURATION.fast, reduceMotion: ReduceMotion.System });
  }

  function chooseSort() {
    Alert.alert(t("subscriptions.sort.renewalDate"), undefined, [
      ...sortOptions.map((item) => ({
        text: sort === item.value ? `✓ ${item.label}` : item.label,
        onPress: () => setSort(item.value)
      })),
      { text: t("common.cancel"), style: "cancel" as const }
    ]);
  }

  function chooseGroup() {
    Alert.alert(t("subscriptions.groups.category"), undefined, [
      { text: groupMode === "none" ? `✓ ${t("subscriptions.groups.none")}` : t("subscriptions.groups.none"), onPress: () => setGroupMode("none") },
      { text: groupMode === "category" ? `✓ ${t("subscriptions.groups.category")}` : t("subscriptions.groups.category"), onPress: () => setGroupMode("category") },
      { text: groupMode === "date" ? `✓ ${t("subscriptions.groups.date")}` : t("subscriptions.groups.date"), onPress: () => setGroupMode("date") },
      { text: t("common.cancel"), style: "cancel" as const }
    ]);
  }

  const refresh = useCallback(() => {
    if (isOfflineMode) return;
    syncFromServer().catch(() => undefined);
  }, [isOfflineMode, syncFromServer]);

  function confirmDelete(subscription: Subscription, swipeable: SwipeableMethods) {
    Alert.alert(t("subscriptions.detail.deleteConfirmTitle"), t("subscriptions.detail.deleteConfirmMessage", { name: subscription.name }), [
      { text: t("common.cancel"), style: "cancel", onPress: () => swipeable.close() },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          haptic.warning();
          swipeable.close();
          deleteSubscription(subscription.id).catch(() => undefined);
        }
      }
    ]);
  }

  function renderItem({ item, index }: { item: Subscription; index: number }) {
    return (
      <FadeInView index={index}>
        <SubscriptionRow
          item={item}
          compact={compact}
          onDelete={confirmDelete}
          onToggle={(sub) => {
            updateSubscription(sub.id, { isActive: !sub.isActive }).catch(() => undefined);
          }}
          onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
        />
      </FadeInView>
    );
  }

  const header = (
    <View className="mb-5">
      <View className="flex-row items-start justify-between gap-4">
        <View>
          <Text className="text-3xl font-bold tracking-tight text-ink">{t("subscriptions.title")}</Text>
          <Text className="mt-1 text-sm text-subtle">
            {showArchived
              ? `${t("subscriptions.detail.archived")}: ${filtered.length}`
              : `${filtered.length} / ${subscriptions.length}${dueSoonCount > 0 ? ` · ${dueSoonCount} due soon` : ""}`}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <AnimatedPressable
            className={`h-9 w-9 items-center justify-center rounded-xl border border-border ${showArchived ? "bg-ink" : "bg-surface"}`}
            onPress={() => setShowArchived((v) => !v)}
          >
            <Feather name="archive" size={15} color={showArchived ? "#fafafa" : "#a3a3a3"} />
          </AnimatedPressable>
          <AnimatedPressable
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface"
            onPress={() => setCompact((v) => !v)}
          >
            <Feather name={compact ? "grid" : "list"} size={15} color="#a3a3a3" />
          </AnimatedPressable>
          <AnimatedPressable
            className="h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface"
            onPress={toggleAdvancedFilters}
          >
            <Feather name="sliders" size={15} color={showAdvancedFilters || filter !== "all" || groupMode !== "none" ? "#fafafa" : "#a3a3a3"} />
          </AnimatedPressable>
        </View>
      </View>

      <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
        <Feather name="search" size={16} color="#525252" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={`${t("subscriptions.title")}...`}
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

      <View className="mt-3 flex-row rounded-2xl border border-border bg-surface p-1" onLayout={handleTabsLayout}>
        {tabWidth > 0 && (
          <Animated.View
            style={[pillStyle, { position: "absolute", left: 4, top: 4, bottom: 4, width: tabWidth, borderRadius: 12, backgroundColor: pillColor }]}
            pointerEvents="none"
          />
        )}
        {primaryFilters.map((item) => (
          <AnimatedPressable
            key={item.value}
            className="h-10 flex-1 items-center justify-center rounded-xl"
            hapticFeedback={false}
            onPress={() => setFilterAndAnimatePill(item.value)}
          >
            <Text className={`text-sm font-semibold ${filter === item.value ? "text-bg" : "text-muted"}`}>
              {item.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {showAdvancedFilters ? (
        <Animated.View className="mt-3 gap-3 rounded-2xl border border-border bg-surface p-3" style={filterPanelStyle}>
          <View className="flex-row gap-2">
            <AnimatedPressable
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5"
              onPress={chooseSort}
            >
              <Feather name="sliders" size={14} color="#a3a3a3" />
              <Text className="text-xs font-semibold text-subtle">{activeSortLabel}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              className="flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5"
              onPress={chooseGroup}
            >
              <Feather name="layers" size={14} color={groupMode !== "none" ? "#fafafa" : "#a3a3a3"} />
              <Text className="text-xs font-semibold text-subtle">
                {groupMode === "category" ? t("subscriptions.groups.category") : groupMode === "date" ? t("subscriptions.groups.date") : t("subscriptions.groups.none")}
              </Text>
            </AnimatedPressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {categoryFilters.map((item) => (
                <AnimatedPressable
                  key={item.value}
                  className={`rounded-full border px-3 py-1.5 ${filter === item.value ? "border-ink bg-ink" : "border-border bg-bg"}`}
                  onPress={() => setFilter(item.value)}
                >
                  <Text className={`text-xs font-medium ${filter === item.value ? "text-bg" : "text-muted"}`}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </Animated.View>
      ) : null}

      {filter !== "all" || groupMode !== "none" ? (
        <View className="mt-3 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
          <Text className="text-xs font-semibold text-muted">{t("stats.categoryFilter")}</Text>
          <AnimatedPressable
            onPress={() => {
              setFilter("all");
              setGroupMode("none");
            }}
          >
            <Text className="text-xs font-bold uppercase tracking-widest text-ink">{t("common.reset")}</Text>
          </AnimatedPressable>
        </View>
      ) : null}

      {isOfflineMode ? (
        <Text className="mt-3 text-xs font-medium text-muted">{t("common.offline")}</Text>
      ) : null}

      <RefreshIndicator visible={isSyncing} />
    </View>
  );

  const emptyComponent = (
    <EmptyState
      icon={subscriptions.length === 0 ? "credit-card" : "search"}
      title={subscriptions.length === 0 ? t("home.noSubscriptions") : t("home.noResults")}
      subtitle={
        subscriptions.length === 0
          ? t("home.noSubscriptionsHint")
          : t("home.noResultsHint")
      }
      action={
        subscriptions.length === 0
          ? { label: t("home.addFirst"), onPress: () => router.push("/(app)/(tabs)/subscriptions/new") }
          : undefined
      }
    />
  );

  return (
    <ScreenTransition className="flex-1 bg-bg" replayOnFocus={false}>
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
            <Text className="mb-2 mt-5 text-sm font-semibold text-muted">
              {section.title}
            </Text>
          ) : null
        }
        SectionSeparatorComponent={() => null}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListHeaderComponent={header}
        ListEmptyComponent={emptyComponent}
      />

      <FadeInView index={0} replayOnFocus style={{ position: "absolute", bottom: 112, right: 20 }}>
        <AnimatedPressable
          className="h-16 w-16 items-center justify-center rounded-full bg-accent"
          scaleTarget={0.92}
          onPress={handleAddPress}
        >
          <Text className="text-3xl font-light text-bg">+</Text>
        </AnimatedPressable>
      </FadeInView>
    </ScreenTransition>
  );
}
