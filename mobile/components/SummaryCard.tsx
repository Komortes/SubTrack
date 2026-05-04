import { Text, View } from "react-native";
import { formatMoney, monthProgress } from "@/lib/subscriptionMath";

type Props = {
  monthlyTotal: number;
  yearlyTotal: number;
};

export function SummaryCard({ monthlyTotal, yearlyTotal }: Props) {
  const progress = monthProgress();

  return (
    <View className="rounded-3xl bg-ink p-6">
      <Text className="text-sm font-medium text-white/70">Текущий месяц</Text>
      <View className="mt-3 flex-row items-end justify-between">
        <View>
          <Text className="text-4xl font-bold text-white">{formatMoney(monthlyTotal)}</Text>
          <Text className="mt-2 text-sm text-white/65">~{formatMoney(yearlyTotal)} в год</Text>
        </View>
        <View className="h-24 w-4 justify-end overflow-hidden rounded-full bg-white/15">
          <View className="rounded-full bg-accent" style={{ height: `${Math.round(progress * 100)}%` }} />
        </View>
      </View>
    </View>
  );
}

