import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { ReduceMotion, runOnJS, useAnimatedReaction, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { formatMoney, monthProgress } from "@/lib/subscriptionMath";
import { useSettingsStore } from "@/store/settingsStore";

type Props = {
  monthlyTotal: number;
  yearlyTotal: number;
  trend?: number | null;
};

function useCountingValue(target: number): number {
  const [display, setDisplay] = useState(target);
  const anim = useSharedValue(target);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    anim.value = withTiming(target, { duration: 600 });
  }, [target, anim]);

  useAnimatedReaction(
    () => Math.round(anim.value),
    (rounded, prev) => {
      if (rounded !== prev) runOnJS(setDisplay)(rounded);
    }
  );

  return display;
}

export function SummaryCard({ monthlyTotal, yearlyTotal, trend }: Props) {
  const { t } = useTranslation();
  const progress = monthProgress();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const animatedMonthly = useCountingValue(monthlyTotal);
  const animatedYearly = useCountingValue(yearlyTotal);

  const barAnim = useSharedValue(0);
  useEffect(() => {
    barAnim.value = withTiming(progress, { duration: 600, reduceMotion: ReduceMotion.System });
  }, [progress, barAnim]);
  const barStyle = useAnimatedStyle(() => ({ height: `${barAnim.value * 100}%` as unknown as number }));

  const trendText =
    trend == null ? null
    : trend === 0 ? `= ${t("home.monthly")}`
    : trend > 0 ? `↑ ${Math.abs(trend).toFixed(0)}% ${t("stats.periods.month")}`
    : `↓ ${Math.abs(trend).toFixed(0)}% ${t("stats.periods.month")}`;

  const trendPositive = trend != null && trend > 0;

  return (
    <View className="rounded-3xl border border-border bg-surface p-6">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("stats.periods.month")}</Text>
      <View className="mt-3 flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-4xl font-bold tracking-tighter text-ink">{formatMoney(animatedMonthly, primaryCurrency)}</Text>
          <Text className="mt-2 text-sm text-subtle">~{formatMoney(animatedYearly, primaryCurrency)} {t("home.yearly")}</Text>
          {trendText ? (
            <Text className={`mt-1.5 text-xs font-semibold ${trendPositive ? "text-danger" : "text-subtle"}`}>
              {trendText}
            </Text>
          ) : null}
        </View>
        <View className="h-24 w-4 justify-end overflow-hidden rounded-full bg-border">
          <Animated.View className="rounded-full bg-neutral-500" style={barStyle} />
        </View>
      </View>
    </View>
  );
}
