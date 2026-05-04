import { ScrollView, Text, View } from "react-native";
import { daysUntil, formatMoney } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { ServiceIcon } from "./ServiceIcon";

type Props = {
  subscriptions: Subscription[];
};

export function UpcomingList({ subscriptions }: Props) {
  const upcoming = subscriptions
    .filter((item) => item.isActive && daysUntil(item.renewalDate) <= 7)
    .sort((a, b) => a.renewalDate.localeCompare(b.renewalDate));

  if (upcoming.length === 0) {
    return <Text className="text-sm text-muted">В ближайшие 7 дней списаний нет.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3">
      {upcoming.map((item) => {
        const days = daysUntil(item.renewalDate);
        return (
          <View
            key={item.id}
            className={`w-40 rounded-2xl border p-4 ${days <= 0 ? "border-red-200 bg-red-50" : "border-line bg-white"}`}
          >
            <ServiceIcon name={item.name} iconSlug={item.iconSlug} color={item.color} size={36} />
            <Text className="mt-3 font-semibold text-ink">{item.name}</Text>
            <Text className="mt-1 text-sm text-muted">{formatMoney(item.amount, item.currency)}</Text>
            <Text className={days <= 0 ? "mt-2 text-sm font-semibold text-danger" : "mt-2 text-sm text-muted"}>
              {days === 0 ? "сегодня" : `через ${days} дней`}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}

