import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { CategoryPie } from "@/components/CategoryPie";
import { MonthlyChart } from "@/components/MonthlyChart";
import { formatMoney } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";

const periods = ["Месяц", "Квартал", "Год"] as const;

const categoryLabelMap: Record<string, string> = {
  entertainment: "Entertainment",
  productivity: "Productivity",
  work: "Software & Tools",
  cloud: "Cloud",
  health: "Health & Fitness",
  software: "Software",
  other: "Other"
};

export default function StatsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("Месяц");
  const { monthlyTotal, activeCount, byCategory } = useAnalytics();

  const averagePerSub = activeCount > 0 ? monthlyTotal / activeCount : 0;

  const categoryBreakdownItems = Object.entries(byCategory)
    .map(([key, amount]) => ({ label: categoryLabelMap[key] ?? key, amount }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = categoryBreakdownItems.reduce((max, item) => Math.max(max, item.amount), 0);

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-4 px-5 pb-32 pt-16">

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
        <FadeInView index={0} className="rounded-2xl border border-border bg-surface p-5">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Total Spend</Text>
          <View className="mt-2 flex-row items-end gap-2">
            <Text className="text-4xl font-bold tracking-tighter text-ink">
              {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(monthlyTotal)}
            </Text>
            <Text className="mb-1 text-xl font-semibold text-muted">CZK</Text>
          </View>
        </FadeInView>

        {/* Average + Count */}
        <View className="flex-row gap-3">
          <FadeInView index={1} className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Average</Text>
            <View className="mt-2 flex-row items-end gap-1.5">
              <Text className="text-2xl font-bold tracking-tight text-ink">
                {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(averagePerSub)}
              </Text>
              <Text className="mb-0.5 text-sm font-semibold text-muted">CZK</Text>
            </View>
          </FadeInView>
          <FadeInView index={2} className="flex-1 rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Count of Subs</Text>
            <View className="mt-2 flex-row items-end gap-1.5">
              <Text className="text-2xl font-bold tracking-tight text-ink">{activeCount}</Text>
              <Text className="mb-0.5 text-sm text-muted">active</Text>
            </View>
          </FadeInView>
        </View>

        {/* Last 6 months chart */}
        <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Last 6 Months</Text>
          <MonthlyChart monthlyTotal={monthlyTotal} />
        </FadeInView>

        {/* Category breakdown — no card, on dark background */}
        {categoryBreakdownItems.length > 0 ? (
          <FadeInView index={4} className="rounded-2xl border border-border bg-surface p-5">
            <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">Category Breakdown</Text>
            {categoryBreakdownItems.map((item) => {
              const pct = maxCategoryAmount > 0 ? item.amount / maxCategoryAmount : 0;
              return (
                <View key={item.label} className="mb-5">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-base text-ink">{item.label}</Text>
                    <Text className="font-semibold text-subtle">
                      {new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(item.amount)} CZK
                    </Text>
                  </View>
                  <View className="h-0.5 overflow-hidden rounded-full bg-border">
                    <View className="h-0.5 rounded-full bg-ink" style={{ width: `${pct * 100}%` }} />
                  </View>
                </View>
              );
            })}
          </FadeInView>
        ) : null}

        {/* Pie chart */}
        <FadeInView index={5}>
          <CategoryPie values={byCategory} />
        </FadeInView>

        {/* Forecast — white card */}
        <FadeInView index={6}>
          <View className="rounded-2xl bg-ink p-5">
            <Text className="text-xs font-semibold uppercase tracking-widest text-bg/50">Forecast</Text>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="flex-1 text-base font-bold text-bg">
                В следующем месяце ожидается {formatMoney(monthlyTotal)}
              </Text>
              <Text className="text-2xl text-bg/70">↗</Text>
            </View>
          </View>
        </FadeInView>

      </ScrollView>
    </ScreenTransition>
  );
}
