import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionCategory } from "@/lib/types";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const filters: Array<{ label: string; value: "all" | "active" | "paused" | SubscriptionCategory }> = [
  { label: "Все", value: "all" },
  { label: "Активные", value: "active" },
  { label: "Приостановленные", value: "paused" },
  { label: "Развлечения", value: "entertainment" },
  { label: "Работа", value: "work" },
  { label: "Облако", value: "cloud" },
  { label: "Здоровье", value: "health" },
  { label: "Другое", value: "other" }
];

export default function SubscriptionsScreen() {
  const [filter, setFilter] = useState<(typeof filters)[number]["value"]>("all");
  const { subscriptions } = useSubscriptions();

  const filtered = useMemo(
    () =>
      subscriptions.filter((item) => {
        if (filter === "all") return true;
        if (filter === "active") return item.isActive;
        if (filter === "paused") return !item.isActive;
        return item.category === filter;
      }),
    [filter, subscriptions]
  );

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-5 pb-28 pt-16">
      <View className="flex-row items-center justify-between">
        <Text className="text-3xl font-bold text-ink">Подписки</Text>
        <Pressable className="rounded-xl border border-line bg-white px-3 py-2">
          <Text className="text-sm font-semibold text-ink">Дата</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
        <View className="flex-row gap-2">
          {filters.map((item) => (
            <Pressable
              key={item.value}
              className={`rounded-full px-4 py-2 ${filter === item.value ? "bg-ink" : "bg-white"}`}
              onPress={() => setFilter(item.value)}
            >
              <Text className={filter === item.value ? "font-semibold text-white" : "font-semibold text-ink"}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <View className="mt-5 gap-3">
        {filtered.map((item) => (
          <SubscriptionCard
            key={item.id}
            subscription={item}
            onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

