import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { categoryLabels, periodLabels } from "@/lib/catalog";
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
  const days = daysUntil(subscription.renewalDate);
  const renewalLabel = days === 0 ? "сегодня" : days < 0 ? "просрочено" : `через ${days} дн.`;
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);

  const showConverted = subscription.currency !== primaryCurrency;
  const monthlyInPrimary = showConverted
    ? convertAmount(normalizeMonthlyAmount(subscription), subscription.currency, primaryCurrency, rates)
    : null;

  if (compact) {
    return (
      <AnimatedPressable
        className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-3"
        onPress={onPress}
      >
        <View className="h-full w-[3px] rounded-full" style={{ backgroundColor: subscription.color }} />
        <ServiceIcon name={subscription.name} iconSlug={subscription.iconSlug} color={subscription.color} size={32} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-ink" numberOfLines={1}>{subscription.name}</Text>
          <Text className="text-xs text-muted">{categoryLabels[subscription.category]}</Text>
        </View>
        <View className="items-end">
          <Text className="text-sm font-bold text-ink">
            {formatMoney(subscription.amount, subscription.currency)}
          </Text>
          <Text className={`text-xs ${days <= 0 ? "font-semibold text-danger" : "text-muted"}`}>
            {renewalLabel}
          </Text>
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable className="overflow-hidden rounded-2xl border border-border bg-surface" onPress={onPress}>
      <View className="h-[3px] w-full" style={{ backgroundColor: subscription.color }} />
      <View className="flex-row items-center gap-3 p-4">
        <ServiceIcon
          name={subscription.name}
          iconSlug={subscription.iconSlug}
          color={subscription.color}
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-base font-semibold text-ink">{subscription.name}</Text>
            <View className="items-end">
              <Text className="text-base font-bold text-ink">
                {formatMoney(subscription.amount, subscription.currency)}
              </Text>
              {monthlyInPrimary !== null ? (
                <Text className="text-xs text-muted">
                  ≈ {formatMoney(monthlyInPrimary, primaryCurrency)}/мес
                </Text>
              ) : null}
            </View>
          </View>
          <View className="mt-1 flex-row items-center justify-between gap-2">
            <Text className="text-xs text-muted">
              {categoryLabels[subscription.category]} · {periodLabels[subscription.billingPeriod]}
            </Text>
            <Text className={days <= 0 ? "text-xs font-semibold text-danger" : "text-xs text-muted"}>
              {renewalLabel}
            </Text>
          </View>
        </View>
      </View>
    </AnimatedPressable>
  );
}
