import { Feather } from "@expo/vector-icons";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";

type Props = {
  subscriptions: Subscription[];
};

type Insight = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
};

export function InsightCard({ subscriptions }: Props) {
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);

  const insight = useMemo<Insight | null>(() => {
    const active = subscriptions.filter((s) => s.isActive);
    if (active.length === 0) return null;

    const withMonthly = active.map((s) => ({
      ...s,
      monthly: convertAmount(normalizeMonthlyAmount(s), s.currency, primaryCurrency, rates),
    }));

    // Most expensive renewal day this month
    const byDay = new Map<number, number>();
    for (const s of withMonthly) {
      const d = new Date(`${s.renewalDate}T00:00:00`);
      const day = d.getDate();
      byDay.set(day, (byDay.get(day) ?? 0) + s.monthly);
    }
    if (byDay.size > 0) {
      const [day, total] = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        icon: "trending-up",
        label: "Самый дорогой день",
        value: `${day}-е · ${formatMoney(total, primaryCurrency)}`,
      };
    }

    // Fallback: most expensive subscription
    const top = [...withMonthly].sort((a, b) => b.monthly - a.monthly)[0];
    return {
      icon: "star",
      label: "Самая дорогая",
      value: `${top.name} · ${formatMoney(top.monthly, primaryCurrency)}/мес`,
    };
  }, [subscriptions, primaryCurrency, rates]);

  if (!insight) return null;

  return (
    <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3.5">
      <View className="h-8 w-8 items-center justify-center rounded-xl bg-border">
        <Feather name={insight.icon} size={15} color="#a3a3a3" />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{insight.label}</Text>
        <Text className="mt-0.5 text-sm font-medium text-ink" numberOfLines={1}>{insight.value}</Text>
      </View>
    </View>
  );
}
