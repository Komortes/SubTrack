import { Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { categoryLabels, periodLabels } from "@/lib/catalog";
import { daysUntil, formatMoney } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { ServiceIcon } from "./ServiceIcon";

type Props = {
  subscription: Subscription;
  onPress?: () => void;
};

export function SubscriptionCard({ subscription, onPress }: Props) {
  const days = daysUntil(subscription.renewalDate);
  const renewalLabel = days === 0 ? "сегодня" : days < 0 ? "просрочено" : `через ${days} дней`;

  return (
    <AnimatedPressable className="rounded-2xl border border-border bg-surface p-4" onPress={onPress}>
      <View className="flex-row items-center gap-3">
        <ServiceIcon
          name={subscription.name}
          iconSlug={subscription.iconSlug}
          color={subscription.color}
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-base font-semibold text-ink">{subscription.name}</Text>
            <Text className="text-base font-bold text-ink">
              {formatMoney(subscription.amount, subscription.currency)}
            </Text>
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
