import { Text, View } from "react-native";
import { formatMoney, monthProgress } from "@/lib/subscriptionMath";

type Props = {
  monthlyTotal: number;
  yearlyTotal: number;
};

export function SummaryCard({ monthlyTotal, yearlyTotal }: Props) {
  const progress = monthProgress();

  return (
    <View className="rounded-3xl border border-border bg-surface p-6">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Текущий месяц</Text>
      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text className="text-4xl font-bold tracking-tighter text-ink">{formatMoney(monthlyTotal)}</Text>
          <Text className="mt-2 text-sm text-subtle">~{formatMoney(yearlyTotal)} в год</Text>
        </View>
        <View className="h-24 w-4 justify-end overflow-hidden rounded-full bg-border">
          <View className="rounded-full bg-neutral-500" style={{ height: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>
    </View>
  );
}
