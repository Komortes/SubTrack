import { Text, View } from "react-native";
import { formatMoney } from "@/lib/subscriptionMath";

type Props = {
  values: Record<string, number>;
};

const labels: Record<string, string> = {
  entertainment: "Развлечения",
  work: "Работа",
  cloud: "Облако",
  health: "Здоровье",
  other: "Другое"
};

const colors: Record<string, string> = {
  entertainment: "#DB2777",
  work: "#0F766E",
  cloud: "#2563EB",
  health: "#16A34A",
  other: "#6B7280"
};

export function CategoryPie({ values }: Props) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">По категориям</Text>
      <View className="mt-4 gap-3">
        {entries.map(([key, value]) => (
          <View key={key}>
            <View className="flex-row justify-between">
              <Text className="text-sm text-ink">{labels[key] ?? key}</Text>
              <Text className="text-sm font-medium text-subtle">{formatMoney(value)}</Text>
            </View>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <View
                className="h-2 rounded-full"
                style={{ width: `${Math.round((value / total) * 100)}%`, backgroundColor: colors[key] }}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
