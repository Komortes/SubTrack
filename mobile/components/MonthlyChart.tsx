import { Text, View } from "react-native";
import { formatMoney } from "@/lib/subscriptionMath";

type Props = {
  monthlyTotal: number;
  data?: {
    key: string;
    label: string;
    total: number;
  }[];
};

const labels = ["Дек", "Янв", "Фев", "Мар", "Апр", "Май"];

export function MonthlyChart({ monthlyTotal, data }: Props) {
  const points = data?.length
    ? data.slice(-6)
    : labels.map((label, index) => ({
        key: label,
        label,
        total: monthlyTotal * (0.75 + index * 0.05)
      }));
  const values = points.map((point) => point.total);
  const max = Math.max(...values, 1);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Расходы по месяцам</Text>
      <View className="mt-5 h-40 flex-row items-end gap-3">
        {points.map((point) => (
          <View key={point.key} className="flex-1 items-center gap-2">
            <View className="w-full justify-end rounded-xl bg-border" style={{ height: 120 }}>
              <View
                className="rounded-xl bg-neutral-500"
                style={{ height: point.total > 0 ? Math.max(14, (point.total / max) * 120) : 4 }}
              />
            </View>
            <Text className="text-xs text-muted">{point.label}</Text>
          </View>
        ))}
      </View>
      <Text className="mt-3 text-sm text-subtle">Текущий темп: {formatMoney(monthlyTotal)}/мес</Text>
    </View>
  );
}
