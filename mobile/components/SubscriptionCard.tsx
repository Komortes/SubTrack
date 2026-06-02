import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { daysUntil, formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ServiceIcon } from "./ServiceIcon";

type Props = {
  subscription: Subscription;
  compact?: boolean;
  onPress?: () => void;
};

export function SubscriptionCard({ subscription, compact = false, onPress }: Props) {
  const { t } = useTranslation();
  const days = daysUntil(subscription.renewalDate);
  const paused = !subscription.isActive && !subscription.isArchived;
  const trial = subscription.isTrial;
  const urgent = !paused && !trial && days <= 0;
  const renewalLabel = days === 0
    ? t("subscriptions.card.today")
    : days < 0
      ? t("subscriptions.detail.renewedDaysAgo", { days: Math.abs(days) })
      : t("subscriptions.card.daysLeft", { days });
  const statusLabel = paused
    ? t("subscriptions.filters.paused")
    : trial
      ? t("subscriptions.card.trial")
      : renewalLabel;
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);

  const showConverted = subscription.currency !== primaryCurrency;
  const monthlyInPrimary = showConverted
    ? convertAmount(normalizeMonthlyAmount(subscription), subscription.currency, primaryCurrency, rates)
    : null;

  if (compact) {
    return (
      <AnimatedPressable
        className={`flex-row items-center gap-3 rounded-2xl border px-3 py-3 ${urgent ? "border-danger/30 bg-danger/10" : paused ? "border-border bg-surface/60" : "border-border bg-surface"}`}
        onPress={onPress}
      >
        <View className={`h-full w-[3px] rounded-full ${paused ? "opacity-30" : ""}`} style={{ backgroundColor: subscription.color }} />
        <ServiceIcon name={subscription.name} iconSlug={subscription.iconSlug} color={subscription.color} size={32} />
        <View className="flex-1">
          <Text className={`text-sm font-semibold ${paused ? "text-subtle" : "text-ink"}`} numberOfLines={1}>{subscription.name}</Text>
          <Text className="text-xs text-muted">{t(`categories.${subscription.category}`, subscription.category)}</Text>
        </View>
        <View className="items-end">
          <Text className={`text-sm font-bold ${paused ? "text-muted" : "text-ink"}`}>
            {formatMoney(subscription.amount, subscription.currency)}
          </Text>
          <Text className={`text-xs ${urgent ? "font-semibold text-danger" : paused ? "font-semibold text-muted" : "text-muted"}`}>
            {statusLabel}
          </Text>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable className={`overflow-hidden rounded-2xl border ${urgent ? "border-danger/30 bg-danger/10" : paused ? "border-border bg-surface/60" : "border-border bg-surface"}`} onPress={onPress}>
      <View className={`h-[3px] w-full ${paused ? "opacity-30" : ""}`} style={{ backgroundColor: subscription.color }} />
      <View className="flex-row items-center gap-3 p-4">
        <ServiceIcon
          name={subscription.name}
          iconSlug={subscription.iconSlug}
          color={subscription.color}
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <Text className={`flex-1 text-base font-semibold ${paused ? "text-subtle" : "text-ink"}`} numberOfLines={1}>{subscription.name}</Text>
              {paused ? (
                <View className="rounded-full border border-border bg-bg px-2 py-0.5">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-muted">{t("subscriptions.filters.paused")}</Text>
                </View>
              ) : trial ? (
                <View className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-accent">{t("subscriptions.card.trial")}</Text>
                </View>
              ) : null}
            </View>
            <View className="items-end">
              <Text className={`text-base font-bold ${paused ? "text-muted" : "text-ink"}`}>
                {formatMoney(subscription.amount, subscription.currency)}
              </Text>
              {monthlyInPrimary !== null ? (
                <Text className="text-xs text-muted">
                  ≈ {formatMoney(monthlyInPrimary, primaryCurrency)}{t("common.perMonth")}
                </Text>
              ) : null}
            </View>
          </View>
          <View className="mt-1 flex-row items-center justify-between gap-2">
            <Text className="text-xs text-muted">
              {t(`categories.${subscription.category}`, subscription.category)} · {t(`billingPeriods.${subscription.billingPeriod}`, subscription.billingPeriod)}
            </Text>
            <View className={`rounded-full px-2.5 py-1 ${urgent ? "bg-danger/15" : "bg-bg"}`}>
              <Text className={urgent ? "text-xs font-semibold text-danger" : "text-xs font-semibold text-muted"}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
