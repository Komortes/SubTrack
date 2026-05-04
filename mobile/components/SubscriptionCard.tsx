import { Pressable, Text, View } from "react-native";
import { daysUntil, formatMoney } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { ServiceIcon } from "./ServiceIcon";

type Props = {
  subscription: Subscription;
  onPress?: () => void;
};

const categoryLabel: Record<string, string> = {
  entertainment: "Развлечения",
  work: "Работа",
  cloud: "Облако",
  health: "Здоровье",
  other: "Другое"
};

export function SubscriptionCard({ subscription, onPress }: Props) {
  const days = daysUntil(subscription.renewalDate);
  const renewalLabel = days === 0 ? "сегодня" : days < 0 ? "просрочено" : `через ${days} дней`;

  return (
    <Pressable
      className="rounded-2xl border border-line bg-white p-4"
      onPress={onPress}
    >
      <View className="flex-row items-center gap-3">
        <ServiceIcon
          name={subscription.name}
          iconSlug={subscription.iconSlug}
          color={subscription.color}
        />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-base font-semibold text-ink">{subscription.name}</Text>
            <Text className="text-sm font-semibold text-ink">
              {formatMoney(subscription.amount, subscription.currency)}
            </Text>
          </View>
          <View className="mt-1 flex-row items-center justify-between gap-2">
            <Text className="text-sm text-muted">{categoryLabel[subscription.category]}</Text>
            <Text className={days <= 0 ? "text-sm font-semibold text-danger" : "text-sm text-muted"}>
              {renewalLabel}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

