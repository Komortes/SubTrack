import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { CategoryPie } from "@/components/CategoryPie";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ServiceIcon } from "@/components/ServiceIcon";
import { categoryLabels } from "@/lib/catalog";
import { formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useSettingsStore } from "@/store/settingsStore";

const periods = ["Месяц", "Квартал", "Год"] as const;

export default function StatsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("Месяц");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { monthlyTotal, yearlyTotal, activeCount, byCategory, monthlyHistory, analyticsError, topSubscriptions } = useAnalytics();
  const { activeSubscriptions } = useSubscriptions();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);

  const periodMultiplier = period === "Месяц" ? 1 : period === "Квартал" ? 3 : 12;
  const periodTotal = period === "Год" ? yearlyTotal : monthlyTotal * periodMultiplier;
  const averagePerSub = activeCount > 0 ? periodTotal / activeCount : 0;
  const forecastDelta = periodTotal > 0 ? ((monthlyTotal / (periodTotal / periodMultiplier)) - 1) * 100 : 0;

  const categoryBreakdownItems = Object.entries(byCategory)
    .map(([key, amount]) => ({ key, label: categoryLabels[key as keyof typeof categoryLabels] ?? key, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = categoryBreakdownItems.reduce((max, item) => Math.max(max, item.amount), 0);
  const selectedCategorySubscriptions = selectedCategory
    ? activeSubscriptions
        .filter((subscription) => subscription.category === selectedCategory)
        .sort((a, b) => normalizeMonthlyAmount(b) - normalizeMonthlyAmount(a))
    : [];

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-5 px-5 pb-36 pt-16">

        <View>
          <Text className="text-3xl font-bold tracking-tight text-ink">Статистика</Text>
          <Text className="mt-1 text-subtle">Расходы и аналитика по подпискам</Text>
        </View>

        {/* Period tabs */}
        <View className="flex-row rounded-2xl border border-border bg-surface p-1">
          {periods.map((item) => (
            <AnimatedPressable
              key={item}
              className={`flex-1 rounded-xl py-3 ${period === item ? "bg-ink" : ""}`}
              onPress={() => setPeriod(item)}
            >
              <Text className={period === item ? "text-center font-semibold text-bg" : "text-center font-semibold text-muted"}>
                {item}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {/* Total spend hero */}
        <FadeInView index={0} className="rounded-2xl border border-border bg-surface p-6">
          <Text className="text-sm font-semibold text-muted">Расходы · {period}</Text>
          <View className="mt-3 flex-row items-end gap-2">
            <Text className="text-5xl font-bold tracking-tighter text-ink">
              {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(periodTotal)}
            </Text>
            <Text className="mb-1.5 text-xl font-semibold text-muted">{primaryCurrency}</Text>
          </View>
          {analyticsError ? <Text className="mt-3 text-xs text-danger">{analyticsError}</Text> : null}
        </FadeInView>

        {/* Average + Count */}
        <View className="flex-row gap-3">
          <FadeInView index={1} className="flex-1 rounded-2xl border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Среднее</Text>
            <View className="mt-3 flex-row items-end gap-1.5">
              <Text className="text-2xl font-bold tracking-tight text-ink">
                {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(averagePerSub)}
              </Text>
              <Text className="mb-0.5 text-sm text-muted">{primaryCurrency}</Text>
            </View>
          </FadeInView>
          <FadeInView index={2} className="flex-1 rounded-2xl border border-border bg-surface p-5">
            <Text className="text-sm font-semibold text-muted">Подписок</Text>
            <View className="mt-3 flex-row items-end gap-1.5">
              <Text className="text-2xl font-bold tracking-tight text-ink">{activeCount}</Text>
              <Text className="mb-0.5 text-sm text-muted">активных</Text>
            </View>
          </FadeInView>
        </View>

        {/* Last 6 months chart */}
        <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-5">
          <Text className="mb-4 text-sm font-semibold text-muted">За 6 месяцев</Text>
          <MonthlyChart data={monthlyHistory} monthlyTotal={monthlyTotal} primaryCurrency={primaryCurrency} />
        </FadeInView>

        {/* Category breakdown */}
        {categoryBreakdownItems.length > 0 ? (
          <FadeInView index={4} className="rounded-2xl border border-border bg-surface p-5">
            <Text className="mb-5 text-sm font-semibold text-muted">По категориям</Text>
            {categoryBreakdownItems.map((item) => {
              const pct = maxCategoryAmount > 0 ? item.amount / maxCategoryAmount : 0;
              return (
                <AnimatedPressable key={item.label} className="mb-5" onPress={() => setSelectedCategory(item.key)}>
                  <View className="mb-2.5 flex-row items-center justify-between">
                    <Text className="text-base text-ink">{item.label}</Text>
                    <Text className="font-semibold text-subtle">
                      {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(item.amount * periodMultiplier)} {primaryCurrency}
                    </Text>
                  </View>
                  <View className="h-0.5 overflow-hidden rounded-full bg-border">
                    <View className="h-0.5 rounded-full bg-ink" style={{ width: `${pct * 100}%` }} />
                  </View>
                </AnimatedPressable>
              );
            })}
          </FadeInView>
        ) : null}

        {/* Pie chart */}
        <FadeInView index={5}>
          <CategoryPie
            values={byCategory}
            primaryCurrency={primaryCurrency}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </FadeInView>

        {selectedCategory ? (
          <FadeInView index={6} className="rounded-2xl border border-border bg-surface p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-muted">
                {categoryLabels[selectedCategory as keyof typeof categoryLabels] ?? selectedCategory}
              </Text>
              <AnimatedPressable onPress={() => setSelectedCategory(null)}>
                <Text className="text-xs font-semibold text-subtle">Сбросить</Text>
              </AnimatedPressable>
            </View>
            <View className="gap-3">
              {selectedCategorySubscriptions.map((subscription) => {
                const monthly = normalizeMonthlyAmount(subscription);
                return (
                  <AnimatedPressable
                    key={subscription.id}
                    className="flex-row items-center justify-between gap-3 rounded-2xl border border-border bg-bg p-3.5"
                    onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}`)}
                  >
                    <View className="flex-row flex-1 items-center gap-3">
                      <ServiceIcon
                        name={subscription.name}
                        iconSlug={subscription.iconSlug}
                        color={subscription.color}
                        size={36}
                      />
                      <View className="flex-1">
                        <Text className="font-semibold text-ink">{subscription.name}</Text>
                        <Text className="mt-0.5 text-xs text-muted">
                          {formatMoney(subscription.amount, subscription.currency)}
                        </Text>
                      </View>
                    </View>
                    <Text className="font-bold text-subtle">{formatMoney(monthly, subscription.currency)}/мес</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </FadeInView>
        ) : null}

        <FadeInView index={selectedCategory ? 7 : 6} className="rounded-2xl border border-border bg-surface p-5">
          <Text className="mb-5 text-sm font-semibold text-muted">Топ подписок</Text>
          <View className="gap-4">
            {topSubscriptions.slice(0, 5).map((subscription) => {
              const monthly = normalizeMonthlyAmount(subscription);
              return (
                <AnimatedPressable
                  key={subscription.id}
                  className="flex-row items-center justify-between gap-3"
                  onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}`)}
                >
                  <View className="flex-row flex-1 items-center gap-3">
                    <ServiceIcon
                      name={subscription.name}
                      iconSlug={subscription.iconSlug}
                      color={subscription.color}
                      size={36}
                    />
                    <View className="flex-1">
                      <Text className="font-semibold text-ink">{subscription.name}</Text>
                      <Text className="mt-0.5 text-xs text-muted">
                        {formatMoney(subscription.amount, subscription.currency)} · {formatMoney(monthly, subscription.currency)}/мес
                      </Text>
                    </View>
                  </View>
                  <Text className="font-bold text-subtle">{formatMoney(monthly * periodMultiplier, subscription.currency)}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </FadeInView>

        {/* Forecast */}
        <FadeInView index={selectedCategory ? 8 : 7}>
          <View className="rounded-2xl bg-ink p-6">
            <Text className="text-sm font-semibold text-bg/50">Прогноз</Text>
            <View className="mt-3 flex-row items-center justify-between gap-4">
              <Text className="flex-1 text-base font-bold text-bg">
                В следующем месяце ожидается {formatMoney(monthlyTotal, primaryCurrency)}
              </Text>
              <Text className="text-2xl text-bg/60">{forecastDelta >= 0 ? "↗" : "↘"}</Text>
            </View>
          </View>
        </FadeInView>

      </ScrollView>
    </ScreenTransition>
  );
}
