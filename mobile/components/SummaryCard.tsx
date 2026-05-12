import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { runOnJS, useAnimatedReaction, useSharedValue, withTiming } from "react-native-reanimated";
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
  const progress = monthProgress();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const animatedMonthly = useCountingValue(monthlyTotal);
  const animatedYearly = useCountingValue(yearlyTotal);

  const trendText =
    trend == null ? null
    : trend === 0 ? "= как в прошлом месяце"
    : trend > 0 ? `↑ ${Math.abs(trend).toFixed(0)}% vs прошлый месяц`
    : `↓ ${Math.abs(trend).toFixed(0)}% vs прошлый месяц`;

  const trendPositive = trend != null && trend > 0;

  return (
    <View className="rounded-3xl border border-border bg-surface p-6">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Текущий месяц</Text>
      <View className="mt-3 flex-row items-end justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-4xl font-bold tracking-tighter text-ink">{formatMoney(animatedMonthly, primaryCurrency)}</Text>
          <Text className="mt-2 text-sm text-subtle">~{formatMoney(animatedYearly, primaryCurrency)} в год</Text>
          {trendText ? (
            <Text className={`mt-1.5 text-xs font-semibold ${trendPositive ? "text-danger" : "text-subtle"}`}>
              {trendText}
            </Text>
          ) : null}
        </View>
        <View className="h-24 w-4 justify-end overflow-hidden rounded-full bg-border">
          <View className="rounded-full bg-neutral-500" style={{ height: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>
    </View>
  );
}
