import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { formatMoney } from "@/lib/subscriptionMath";

type Props = {
  monthlyTotal: number;
  primaryCurrency?: string;
  data?: {
    key: string;
    label: string;
    total: number;
  }[];
};

const labels = ["Дек", "Янв", "Фев", "Мар", "Апр", "Май"];

export function MonthlyChart({ monthlyTotal, primaryCurrency = "CZK", data }: Props) {
  const points = useMemo(
    () => data?.length
      ? data.slice(-6)
      : labels.map((label, index) => ({
        key: label,
        label,
        total: monthlyTotal * (0.75 + index * 0.05)
      })),
    [data, monthlyTotal]
  );
  const [selectedKey, setSelectedKey] = useState(points.at(-1)?.key ?? "");
  const values = points.map((point) => point.total);
  const max = Math.max(...values, 1);
  const selectedPoint = points.find((point) => point.key === selectedKey) ?? points.at(-1);

  return (
    <View>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Расходы по месяцам</Text>
        {selectedPoint ? (
          <Text className="text-right text-xs font-semibold text-subtle">
            {selectedPoint.label}: {formatMoney(selectedPoint.total, primaryCurrency)}
          </Text>
        ) : null}
      </View>
      <View className="mt-5 h-40 flex-row items-end gap-3">
        {points.map((point) => {
          const selected = point.key === selectedPoint?.key;
          return (
          <View key={point.key} className="flex-1 items-center gap-2">
            <AnimatedPressable
              className={`w-full justify-end rounded-xl ${selected ? "bg-neutral-700" : "bg-border"}`}
              style={{ height: 120 }}
              scaleTarget={0.96}
              onPress={() => setSelectedKey(point.key)}
            >
              <View
                className={`rounded-xl ${selected ? "bg-ink" : "bg-neutral-500"}`}
                style={{ height: point.total > 0 ? Math.max(14, (point.total / max) * 120) : 4 }}
              />
            </AnimatedPressable>
            <Text className={`text-xs ${selected ? "font-semibold text-ink" : "text-muted"}`}>{point.label}</Text>
          </View>
        );
        })}
      </View>
      <Text className="mt-3 text-sm text-subtle">Текущий темп: {formatMoney(monthlyTotal, primaryCurrency)}/мес</Text>
    </View>
  );
}
