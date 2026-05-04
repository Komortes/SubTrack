import { Text, View } from "react-native";
import { formatMoney } from "@/lib/subscriptionMath";

type Props = {
  monthlyTotal: number;
};

const labels = ["Дек", "Янв", "Фев", "Мар", "Апр", "Май"];

export function MonthlyChart({ monthlyTotal }: Props) {
  const values = labels.map((_, index) => monthlyTotal * (0.75 + index * 0.05));
  const max = Math.max(...values, 1);

  return (
    <View className="rounded-2xl border border-line bg-white p-4">
      <Text className="text-base font-semibold text-ink">Расходы по месяцам</Text>
      <View className="mt-5 h-40 flex-row items-end gap-3">
        {values.map((value, index) => (
          <View key={labels[index]} className="flex-1 items-center gap-2">
            <View className="w-full justify-end rounded-xl bg-surface" style={{ height: 120 }}>
              <View
                className="rounded-xl bg-accent"
                style={{ height: Math.max(14, (value / max) * 120) }}
              />
            </View>
            <Text className="text-xs text-muted">{labels[index]}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-sm text-muted">Текущий темп: {formatMoney(monthlyTotal)}/мес</Text>
    </View>
  );
}

