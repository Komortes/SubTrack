import { Link } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SummaryCard } from "@/components/SummaryCard";
import { UpcomingList } from "@/components/UpcomingList";
import { daysUntil } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function HomeScreen() {
  const { monthlyTotal, yearlyTotal } = useAnalytics();
  const { activeSubscriptions, recentlyAdded } = useSubscriptions();
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const today = activeSubscriptions.filter((item) => daysUntil(item.renewalDate) === 0);

  return (
    <View className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="gap-6 px-5 pb-28 pt-16">
        <View>
          <Text className="text-3xl font-bold text-ink">SubTrack</Text>
          <Text className="mt-1 text-muted">Обзор подписок и списаний</Text>
        </View>
        <SummaryCard monthlyTotal={monthlyTotal} yearlyTotal={yearlyTotal} />
        <View>
          <Text className="mb-3 text-lg font-semibold text-ink">Ближайшие списания</Text>
          <UpcomingList subscriptions={activeSubscriptions} />
        </View>
        {today.length > 0 ? (
          <View className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <Text className="text-base font-semibold text-danger">Сегодня есть списания</Text>
            {today.map((item) => (
              <View key={item.id} className="mt-3 flex-row items-center justify-between">
                <Text className="font-medium text-ink">{item.name}</Text>
                <Pressable className="rounded-xl bg-danger px-3 py-2" onPress={() => markPaid(item.id)}>
                  <Text className="text-sm font-semibold text-white">Оплачено</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        <View>
          <Text className="mb-3 text-lg font-semibold text-ink">Недавно добавленные</Text>
          <View className="gap-3">
            {recentlyAdded.map((item) => (
              <SubscriptionCard key={item.id} subscription={item} />
            ))}
          </View>
        </View>
      </ScrollView>
      <Link href="/(app)/(tabs)/subscriptions/new" asChild>
        <Pressable className="absolute bottom-8 right-5 h-16 w-16 items-center justify-center rounded-full bg-accent shadow-lg">
          <Text className="text-3xl font-light text-white">+</Text>
        </Pressable>
      </Link>
    </View>
  );
}

