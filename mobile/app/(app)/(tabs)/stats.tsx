import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Feather } from "@expo/vector-icons";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { CategoryPie } from "@/components/CategoryPie";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ServiceIcon } from "@/components/ServiceIcon";
import { formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useProStatus } from "@/hooks/useProStatus";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useSettingsStore } from "@/store/settingsStore";

const periodKeys = ["month", "quarter", "year"] as const;
type PeriodKey = (typeof periodKeys)[number];

function MetricPill({ label, value, suffix }: { label: string; value: string | number; suffix?: string }) {
  return (
    <View className="flex-1 border-l border-border pl-3">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</Text>
      <View className="mt-1 flex-row items-end gap-1">
        <Text className="text-xl font-bold text-ink">{value}</Text>
        {suffix ? <Text className="mb-0.5 text-xs text-muted">{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function StatsScreen() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<PeriodKey>("month");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { monthlyTotal, yearlyTotal, activeCount, byCategory, monthlyHistory, analyticsError, topSubscriptions } = useAnalytics();
  const { activeSubscriptions } = useSubscriptions();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const isPro = useProStatus();

  if (!isPro) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <Feather name="lock" size={40} color="#3a3a3a" />
        <Text className="mt-4 text-center text-xl font-bold text-ink">{t("stats.title")}</Text>
        <Text className="mt-2 text-center text-muted">{t("stats.proLocked")}</Text>
        <Pressable
          onPress={() => router.push("/(app)/paywall")}
          className="mt-6 rounded-2xl bg-ink px-8 py-4"
        >
          <Text className="font-semibold text-bg">{t("proGate.upgradeButton")}</Text>
        </Pressable>
      </View>
    );
  }

  const periodMultiplier = period === "month" ? 1 : period === "quarter" ? 3 : 12;
  const periodTotal = period === "year" ? yearlyTotal : monthlyTotal * periodMultiplier;
  const averagePerSub = activeCount > 0 ? periodTotal / activeCount : 0;
  const topSubscription = topSubscriptions[0];
  const topMonthly = topSubscription ? normalizeMonthlyAmount(topSubscription) : 0;
  const topPeriodAmount = topMonthly * periodMultiplier;
  const topShare = periodTotal > 0 && topSubscription ? Math.round((topPeriodAmount / periodTotal) * 100) : 0;
  const formattedPeriodTotal = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(periodTotal);
  const formattedAverage = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(averagePerSub);
  const selectedCategorySubscriptions = selectedCategory
    ? activeSubscriptions
        .filter((subscription) => subscription.category === selectedCategory)
        .sort((a, b) => normalizeMonthlyAmount(b) - normalizeMonthlyAmount(a))
    : [];

  return (
    <ScreenTransition className="flex-1 bg-bg" replayOnFocus={false}>
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-5 px-5 pb-36 pt-16">

        <View>
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-3xl font-bold tracking-tight text-ink">{t("stats.title")}</Text>
              <Text className="mt-1 text-subtle">{t("stats.subtitle")}</Text>
            </View>
            <AnimatedPressable
              className="flex-row items-center gap-1.5 rounded-2xl border border-border bg-surface px-3 py-2"
              onPress={() => router.push("/(app)/wrapped")}
            >
              <Text className="text-sm">🎉</Text>
              <Text className="text-xs font-semibold text-ink">Wrapped</Text>
            </AnimatedPressable>
          </View>
        </View>

        <FadeInView index={0} className="rounded-3xl border border-border bg-surface p-6">
          <View className="flex-row rounded-2xl border border-border bg-bg p-1">
            {periodKeys.map((key) => (
              <AnimatedPressable
                key={key}
                className={`flex-1 rounded-xl py-3 ${period === key ? "bg-ink" : ""}`}
                onPress={() => setPeriod(key)}
              >
                <Text className={period === key ? "text-center font-semibold text-bg" : "text-center font-semibold text-muted"}>
                  {t(`stats.periods.${key}`)}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          <Text className="mt-6 text-sm font-semibold text-muted">{t("stats.spendingLabel", { period: t(`stats.periods.${period}`) })}</Text>
          <View className="mt-3 flex-row items-end gap-2">
            <Text className="text-6xl font-bold tracking-tighter text-ink">{formattedPeriodTotal}</Text>
            <Text className="mb-2 text-xl font-semibold text-muted">{primaryCurrency}</Text>
          </View>
          {analyticsError ? <Text className="mt-3 text-xs text-danger">{analyticsError}</Text> : null}

          <View className="mt-6 flex-row gap-2">
            <MetricPill label={t("stats.metrics.average")} value={formattedAverage} suffix={primaryCurrency} />
            <MetricPill label={t("stats.metrics.active")} value={activeCount} />
            <MetricPill label={t("stats.metrics.top")} value={topShare > 0 ? `${topShare}%` : "0%"} />
          </View>
        </FadeInView>

        <FadeInView index={1} className="rounded-2xl border border-border bg-surface p-5">
          <MonthlyChart data={monthlyHistory} monthlyTotal={monthlyTotal} primaryCurrency={primaryCurrency} />
        </FadeInView>

        <FadeInView index={2}>
          <CategoryPie
            values={byCategory}
            primaryCurrency={primaryCurrency}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        </FadeInView>

        {selectedCategory ? (
          <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-muted">
                {t(`categories.${selectedCategory}`, selectedCategory)}
              </Text>
              <AnimatedPressable onPress={() => setSelectedCategory(null)}>
                <Text className="text-xs font-semibold text-subtle">{t("stats.resetFilter")}</Text>
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
                    <Text className="font-bold text-subtle">{formatMoney(monthly, subscription.currency)}{t("common.perMonth")}</Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </FadeInView>
        ) : null}

        <FadeInView index={selectedCategory ? 4 : 3} className="rounded-2xl border border-border bg-surface p-5">
          <View className="mb-5 flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-muted">{t("stats.topSubscriptions")}</Text>
            {topSubscription ? (
              <Text className="text-xs font-semibold text-subtle">{t("stats.ofPeriod", { percent: topShare })}</Text>
            ) : null}
          </View>
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
                        {formatMoney(subscription.amount, subscription.currency)} · {formatMoney(monthly, subscription.currency)}{t("common.perMonth")}
                      </Text>
                    </View>
                  </View>
                  <Text className="font-bold text-subtle">{formatMoney(monthly * periodMultiplier, subscription.currency)}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </FadeInView>

        <FadeInView index={selectedCategory ? 5 : 4}>
          <View className="rounded-2xl bg-ink p-6">
            <Text className="text-sm font-semibold text-bg/50">{t("stats.nextMonth")}</Text>
            <View className="mt-3 flex-row items-center justify-between gap-4">
              <Text className="flex-1 text-base font-bold text-bg">
                {formatMoney(monthlyTotal, primaryCurrency)}
                {topSubscription ? ` · ${topSubscription.name}` : ""}
              </Text>
              <Text className="text-2xl text-bg/60">→</Text>
            </View>
          </View>
        </FadeInView>

      </ScrollView>
    </ScreenTransition>
  );
}
