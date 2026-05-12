import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { categoryLabels } from "@/lib/catalog";
import { formatMoney } from "@/lib/subscriptionMath";

type Props = {
  values: Record<string, number>;
  primaryCurrency?: string;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
};

const colors: Record<string, string> = {
  entertainment: "#DB2777",
  work: "#0F766E",
  cloud: "#2563EB",
  health: "#16A34A",
  other: "#6B7280"
};

export function CategoryPie({ values, primaryCurrency = "CZK", selectedCategory, onSelectCategory }: Props) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);

  return (
    <View className="rounded-2xl border border-border bg-surface p-4">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">По категориям</Text>
      {entries.length === 0 ? (
        <Text className="mt-3 text-sm text-subtle">Нет активных подписок для расчёта категорий.</Text>
      ) : null}
      <View className="mt-4 gap-3">
        {entries.map(([key, value]) => {
          const selected = selectedCategory === key;
          const percent = total > 0 ? Math.round((value / total) * 100) : 0;
          return (
          <AnimatedPressable
            key={key}
            className={`rounded-2xl border p-3 ${selected ? "border-ink bg-bg" : "border-transparent bg-transparent"}`}
            onPress={() => onSelectCategory?.(selected ? null : key)}
          >
            <View className="flex-row justify-between">
              <View className="flex-row items-center gap-2">
                <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[key] ?? "#6B7280" }} />
                <Text className="text-sm text-ink">{categoryLabels[key as keyof typeof categoryLabels] ?? key}</Text>
              </View>
              <Text className="text-sm font-medium text-subtle">{formatMoney(value, primaryCurrency)} · {percent}%</Text>
            </View>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-border">
              <View
                className="h-2 rounded-full"
                style={{ width: `${percent}%`, backgroundColor: colors[key] ?? "#6B7280" }}
              />
            </View>
          </AnimatedPressable>
        );
        })}
      </View>
    </View>
  );
}
