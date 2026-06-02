import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
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

export function MonthlyChart({ monthlyTotal, primaryCurrency = "CZK", data }: Props) {
  const { t } = useTranslation();

  // Use locale-aware short month labels for placeholder data
  const placeholderLabels = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      return {
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString(undefined, { month: "short" }),
        total: monthlyTotal * (0.75 + i * 0.05)
      };
    });
  }, [monthlyTotal]);

  const points = useMemo(
    () => data?.length ? data.slice(-6) : placeholderLabels,
    [data, placeholderLabels]
  );
  const [selectedKey, setSelectedKey] = useState(points.at(-1)?.key ?? "");
  const values = points.map((point) => point.total);
  const max = Math.max(...values, 1);
  const selectedPoint = points.find((point) => point.key === selectedKey) ?? points.at(-1);

  return (
    <View>
      <View className="flex-row items-start justify-between gap-3">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("stats.monthlyChart")}</Text>
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
      <Text className="mt-3 text-sm text-subtle">{formatMoney(monthlyTotal, primaryCurrency)}{t("common.perMonth")}</Text>
    </View>
  );
}
