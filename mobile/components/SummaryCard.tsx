import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { formatMoney } from "@/lib/subscriptionMath";
import { useSettingsStore } from "@/store/settingsStore";

type Props = { monthlyTotal: number; yearlyTotal: number };

export function SummaryCard({ monthlyTotal, yearlyTotal }: Props) {
  const { t } = useTranslation();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  return (
    <View className="rounded-3xl border border-border bg-surface p-6">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("home.monthlyEstimate")}</Text>
      <Text className="mt-3 text-4xl font-bold tracking-tighter text-ink" numberOfLines={1} adjustsFontSizeToFit>{formatMoney(monthlyTotal, primaryCurrency)}</Text>
      <Text className="mt-2 text-sm text-subtle">≈ {formatMoney(yearlyTotal, primaryCurrency)} {t("home.yearly")}</Text>
      <Text className="mt-4 text-xs leading-5 text-muted">{t("home.estimateHint")}</Text>
    </View>
  );
}
