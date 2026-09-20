import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Alert, RefreshControl, SectionList, ScrollView, Text, TextInput, View } from "react-native";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";
import ReanimatedSwipeable, { SwipeDirection, type SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { EmptyState } from "@/components/EmptyState";
import { RefreshIndicator } from "@/components/RefreshIndicator";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { haptic } from "@/lib/haptics";
import { daysUntil, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription, SubscriptionCategory } from "@/lib/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useIsDark } from "@/hooks/useIsDark";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useProStatus } from "@/hooks/useProStatus";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore, FREE_SUBSCRIPTION_LIMIT } from "@/store/subscriptionStore";
import i18next from "@/lib/i18n";

type SortValue = "renewalDate" | "amount" | "name" | "createdAt";
type FilterValue = "all" | "active" | "paused";
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

const SubscriptionRow = memo(function SubscriptionRow({
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
  onPress: (id: string) => void;
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
            onPress(item.id);
          }
        }}
      />
    </ReanimatedSwipeable>
  );
});

function groupByCategory(items: Subscription[], translate: typeof i18next.t): { title: string; data: Subscription[] }[] {
  const map = new Map<string, Subscription[]>();
  for (const item of items) {
    const key = item.category;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries())
    .map(([key, data]) => ({ title: translate(`categories.${key}`, key), data }))
    .sort((a, b) => b.data.length - a.data.length);
}

function groupByDate(items: Subscription[], translate: typeof i18next.t): { title: string; data: Subscription[] }[] {
  const overdue: Subscription[] = [];
  const thisWeek: Subscription[] = [];
  const thisMonth: Subscription[] = [];
  const later: Subscription[] = [];
  for (const item of items) {
    const d = daysUntil(item.renewalDate);
    if (d < 0) overdue.push(item);
    else if (d <= 7) thisWeek.push(item);
    else if (d <= 30) thisMonth.push(item);
    else later.push(item);
  }
  return [
    { title: translate("subscriptions.detail.overdue"), data: overdue },
    { title: translate("subscriptions.groups.thisWeek"), data: thisWeek },
    { title: translate("subscriptions.groups.thisMonth"), data: thisMonth },
    { title: translate("subscriptions.groups.later"), data: later },
  ].filter((s) => s.data.length > 0);
}

export default function SubscriptionsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const ink = isDark ? "#fafafa" : "#0a0a0a";
  const inverse = isDark ? "#0a0a0a" : "#fafafa";
  const [filter, setFilter] = useState<FilterValue>("all");
  const [category, setCategory] = useState<SubscriptionCategory | "all">("all");
  const [sort, setSort] = useState<SortValue>("renewalDate");
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(false);
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { subscriptions: currentSubscriptions, archivedSubscriptions } = useSubscriptions();
  const subscriptions = showArchived ? archivedSubscriptions : currentSubscriptions;
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const isSyncing = useSubscriptionStore((state) => state.isSyncing);
  const syncFromServer = useSubscriptionStore((state) => state.syncFromServer);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);
  const isPro = useProStatus();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);
  const filtersActive = filter !== "all" || category !== "all" || query.trim().length > 0;
  const categories: SubscriptionCategory[] = ["entertainment", "work", "cloud", "health", "other"];
  const sortOptions: SortValue[] = ["renewalDate", "amount", "name", "createdAt"];
  const groupOptions: GroupMode[] = ["none", "category", "date"];

  function handleAddPress() {
    router.push(!isPro && currentSubscriptions.length >= FREE_SUBSCRIPTION_LIMIT
      ? "/(app)/paywall" : "/(app)/(tabs)/subscriptions/new");
  }

  function resetFilters() {
    setFilter("all");
    setCategory("all");
    setQuery("");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return subscriptions.filter((item) => {
      const matchesSearch = !q || item.name.toLocaleLowerCase().includes(q) || item.notes?.toLocaleLowerCase().includes(q);
      const matchesStatus = filter === "all" || (filter === "active" ? item.isActive : !item.isActive);
      return matchesSearch && matchesStatus && (category === "all" || item.category === category);
    }).sort((a, b) => {
      if (sort === "amount") {
        return convertAmount(normalizeMonthlyAmount({ ...b, isActive: true }), b.currency, primaryCurrency, rates)
          - convertAmount(normalizeMonthlyAmount({ ...a, isActive: true }), a.currency, primaryCurrency, rates);
      }
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "createdAt") return b.createdAt.localeCompare(a.createdAt);
      return a.renewalDate.localeCompare(b.renewalDate);
    });
  }, [filter, category, query, sort, subscriptions, primaryCurrency, rates]);

  const sections = useMemo(() => {
    if (filtered.length === 0) return [];
    if (groupMode === "category") return groupByCategory(filtered, t);
    if (groupMode === "date") return groupByDate(filtered, t);
    return [{ title: "", data: filtered }];
  }, [filtered, groupMode, t]);

  const refresh = useCallback(() => {
    if (!isOfflineMode) void syncFromServer().catch(() => undefined);
  }, [isOfflineMode, syncFromServer]);

  const confirmDelete = useCallback((subscription: Subscription, swipeable: SwipeableMethods) => {
    Alert.alert(t("subscriptions.detail.deleteConfirmTitle"), t("subscriptions.detail.deleteConfirmMessage", { name: subscription.name }), [
      { text: t("common.cancel"), style: "cancel", onPress: () => swipeable.close() },
      { text: t("common.delete"), style: "destructive", onPress: () => {
        haptic.warning();
        swipeable.close();
        void deleteSubscription(subscription.id).catch(() => undefined);
      } }
    ]);
  }, [deleteSubscription, t]);

  const toggleSubscription = useCallback((subscription: Subscription) => {
    const patch = subscription.isArchived ? { isArchived: false, isActive: true } : { isActive: !subscription.isActive };
    void updateSubscription(subscription.id, patch).catch(() => Alert.alert(t("proGate.limitReached"), t("proGate.limitHint")));
  }, [updateSubscription, t]);
  const openSubscription = useCallback((id: string) => router.push(`/(app)/(tabs)/subscriptions/${id}`), []);
  const renderItem = useCallback(({ item }: { item: Subscription }) => (
    <SubscriptionRow item={item} compact={compact} onDelete={confirmDelete} onToggle={toggleSubscription} onPress={openSubscription} />
  ), [compact, confirmDelete, toggleSubscription, openSubscription]);

  const header = (
    <View className="mb-5">
      <Text accessibilityRole="header" className="text-3xl font-bold tracking-tight text-ink">{t(showArchived ? "subscriptions.archiveTitle" : "subscriptions.title")}</Text>
      <View className="mt-2 flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-sm text-muted">{t("subscriptions.resultsCount", { count: filtered.length, total: subscriptions.length })}</Text>
        <View className="flex-row gap-2">
          <AnimatedPressable accessibilityLabel={t(showArchived ? "subscriptions.showCurrent" : "subscriptions.showArchived")} accessibilityState={{ selected: showArchived }}
            className={`h-11 w-11 items-center justify-center rounded-xl border border-border ${showArchived ? "bg-ink" : "bg-surface"}`}
            onPress={() => { setShowArchived(!showArchived); resetFilters(); }}>
            <Feather name="archive" size={18} color={showArchived ? inverse : ink} />
          </AnimatedPressable>
          <AnimatedPressable accessibilityLabel={t(compact ? "subscriptions.expandedView" : "subscriptions.compactView")}
            className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface" onPress={() => setCompact(!compact)}>
            <Feather name={compact ? "grid" : "list"} size={18} color={ink} />
          </AnimatedPressable>
          <AnimatedPressable accessibilityLabel={t("subscriptions.filterOptions")} accessibilityState={{ expanded: showAdvancedFilters }}
            className={`h-11 w-11 items-center justify-center rounded-xl border border-border ${showAdvancedFilters ? "bg-ink" : "bg-surface"}`}
            onPress={() => setShowAdvancedFilters(!showAdvancedFilters)}>
            <Feather name="sliders" size={18} color={showAdvancedFilters ? inverse : ink} />
          </AnimatedPressable>
        </View>
      </View>
      <View className="mt-4 flex-row items-center gap-3 rounded-2xl border border-border bg-surface pl-4 pr-1">
        <Feather name="search" size={18} color={isDark ? "#a3a3a3" : "#525252"} />
        <TextInput value={query} onChangeText={setQuery} accessibilityLabel={t("subscriptions.searchPlaceholder")}
          placeholder={t("subscriptions.searchPlaceholder")} placeholderTextColor={isDark ? "#a3a3a3" : "#646464"}
          className="min-h-12 flex-1 py-3 text-base text-ink" autoCapitalize="none" autoCorrect={false} returnKeyType="search" />
        {query.length > 0 ? <AnimatedPressable accessibilityLabel={t("subscriptions.clearSearch")} className="h-11 w-11 items-center justify-center" onPress={() => setQuery("")}><Feather name="x" size={18} color={ink} /></AnimatedPressable> : null}
      </View>
      {!showArchived ? <View className="mt-3 flex-row rounded-2xl border border-border bg-surface p-1">
        {(["all", "active", "paused"] as FilterValue[]).map((value) => (
          <AnimatedPressable key={value} accessibilityRole="tab" accessibilityState={{ selected: filter === value }}
            className={`min-h-11 flex-1 items-center justify-center rounded-xl px-1 py-2 ${filter === value ? "bg-ink" : ""}`} onPress={() => setFilter(value)}>
            <Text className={`text-sm font-semibold ${filter === value ? "text-bg" : "text-muted"}`}>{t(`subscriptions.filters.${value}`)}</Text>
          </AnimatedPressable>
        ))}
      </View> : null}
      {showAdvancedFilters ? <View className="mt-3 gap-3 rounded-2xl border border-border bg-surface p-4">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptions.sortTitle")}</Text>
        <View className="flex-row flex-wrap gap-2">{sortOptions.map((value) => <AnimatedPressable key={value} accessibilityState={{ selected: sort === value }}
          className={`min-h-11 justify-center rounded-xl border px-3 py-2 ${sort === value ? "border-ink bg-ink" : "border-border bg-bg"}`} onPress={() => setSort(value)}>
          <Text className={`text-sm ${sort === value ? "text-bg" : "text-ink"}`}>{t(`subscriptions.sort.${value}`)}</Text>
        </AnimatedPressable>)}</View>
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptions.groupTitle")}</Text>
        <View className="flex-row flex-wrap gap-2">{groupOptions.map((value) => <AnimatedPressable key={value} accessibilityState={{ selected: groupMode === value }}
          className={`min-h-11 justify-center rounded-xl border px-3 py-2 ${groupMode === value ? "border-ink bg-ink" : "border-border bg-bg"}`} onPress={() => setGroupMode(value)}>
          <Text className={`text-sm ${groupMode === value ? "text-bg" : "text-ink"}`}>{t(`subscriptions.groups.${value}`)}</Text>
        </AnimatedPressable>)}</View>
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("stats.categoryFilter")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View className="flex-row gap-2">
          {(["all", ...categories] as (SubscriptionCategory | "all")[]).map((value) => <AnimatedPressable key={value} accessibilityState={{ selected: category === value }}
            className={`min-h-11 justify-center rounded-full border px-3 py-2 ${category === value ? "border-ink bg-ink" : "border-border bg-bg"}`} onPress={() => setCategory(value)}>
            <Text className={`text-sm ${category === value ? "text-bg" : "text-ink"}`}>{t(value === "all" ? "subscriptions.filters.all" : `categories.${value}`)}</Text>
          </AnimatedPressable>)}
        </View></ScrollView>
      </View> : null}
      {filtersActive ? <AnimatedPressable className="mt-2 min-h-11 justify-center" onPress={resetFilters}><Text className="text-sm font-semibold text-ink">{t("subscriptions.resetFilters")}</Text></AnimatedPressable> : null}
      {isOfflineMode ? <Text className="mt-3 text-xs text-muted">{t("home.offlineMode")}</Text> : null}
      <RefreshIndicator visible={isSyncing} />
    </View>
  );

  return <ScreenTransition className="flex-1 bg-bg" replayOnFocus={false}>
    <SectionList className="flex-1 bg-bg"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 160 }}
      sections={sections} keyExtractor={(item) => item.id} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled"
      stickySectionHeadersEnabled={false} renderItem={renderItem}
      refreshControl={!isOfflineMode ? <RefreshControl refreshing={isSyncing} onRefresh={refresh} tintColor={ink} /> : undefined}
      renderSectionHeader={({ section }) => section.title ? <Text className="mb-3 mt-4 text-sm font-semibold text-muted">{section.title}</Text> : null}
      ItemSeparatorComponent={RowSeparator} ListHeaderComponent={header}
      ListEmptyComponent={<EmptyState icon={showArchived ? "archive" : filtersActive ? "search" : "credit-card"}
        title={t(showArchived && !filtersActive ? "subscriptions.archiveEmpty" : filtersActive ? "home.noResults" : "home.noSubscriptions")}
        subtitle={t(showArchived && !filtersActive ? "subscriptions.archiveEmptyHint" : filtersActive ? "home.noResultsHint" : "home.noSubscriptionsHint")}
        action={filtersActive ? { label: t("subscriptions.resetFilters"), onPress: resetFilters } : showArchived ? undefined : { label: t("home.addFirst"), onPress: handleAddPress }} />}
    />
    <AnimatedPressable accessibilityLabel={t("home.addFirst")} className="absolute right-5 h-14 w-14 items-center justify-center rounded-full bg-accent"
      style={{ bottom: Math.max(insets.bottom, 16) + 88 }} scaleTarget={0.92} onPress={handleAddPress}>
      <Feather name="plus" size={26} color={inverse} />
    </AnimatedPressable>
  </ScreenTransition>;
}

function RowSeparator() {
  return <View className="h-3" />;
}
