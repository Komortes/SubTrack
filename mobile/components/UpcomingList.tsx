import { ScrollView, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { daysUntil, formatMoney } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { ServiceIcon } from "./ServiceIcon";

type Props = {
  subscriptions: Subscription[];
  onPress?: (id: string) => void;
};

export function UpcomingList({ subscriptions, onPress }: Props) {
  const { t } = useTranslation();
  const upcoming = subscriptions
    .filter((item) => item.isActive && daysUntil(item.renewalDate) >= 1 && daysUntil(item.renewalDate) <= 7)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  if (upcoming.length === 0) {
    return <Text className="text-sm text-muted">{t("subscriptions.upcoming.empty")}</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
      {upcoming.map((item, index) => {
        const days = daysUntil(item.renewalDate);
        const dayLabel = days === 0 ? t("subscriptions.card.today") : t("subscriptions.card.daysLeft", { days });
        return (
          <FadeInView key={item.id} index={index}>
            <AnimatedPressable
              className="w-40 rounded-2xl border border-border bg-surface p-4"
              onPress={onPress ? () => onPress(item.id) : undefined}
            >
              <Text className={`text-xs font-semibold uppercase tracking-widest ${days === 0 ? "text-danger" : "text-muted"}`}>
                {dayLabel}
              </Text>
              <View className="mt-3">
                <ServiceIcon name={item.name} iconSlug={item.iconSlug} color={item.color} size={32} />
              </View>
              <Text className="mt-3 font-semibold text-ink">{item.name}</Text>
              <Text className="mt-1 text-base font-bold text-ink">{formatMoney(item.amount, item.currency)}</Text>
            </AnimatedPressable>
          </FadeInView>
        );
      })}
    </ScrollView>
  );
}
