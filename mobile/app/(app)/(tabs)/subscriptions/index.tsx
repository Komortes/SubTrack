import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import { SubscriptionCategory } from "@/lib/types";
import { useSubscriptions } from "@/hooks/useSubscriptions";

const filters: { label: string; value: "all" | "active" | "paused" | SubscriptionCategory }[] = [
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
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 pb-28 pt-16">
        <View className="flex-row items-center justify-between">
          <Text className="text-3xl font-bold tracking-tight text-ink">Подписки</Text>
          <Pressable className="flex-row items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2">
            <Text className="text-sm font-semibold text-ink">Дата</Text>
            <Text className="text-xs text-muted">↕</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-5">
          <View className="flex-row gap-2">
            {filters.map((item) => (
              <AnimatedPressable
                key={item.value}
                className={`rounded-full border px-4 py-2 ${filter === item.value ? "border-ink bg-ink" : "border-border bg-surface"}`}
                onPress={() => setFilter(item.value)}
              >
                <Text className={filter === item.value ? "font-semibold text-bg" : "font-semibold text-muted"}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </ScrollView>
        <View className="mt-5 gap-3">
          {filtered.map((item, index) => (
            <FadeInView key={item.id} index={index}>
              <SubscriptionCard
                subscription={item}
                onPress={() => router.push(`/(app)/(tabs)/subscriptions/${item.id}`)}
              />
            </FadeInView>
          ))}
        </View>
      </ScrollView>
    </ScreenTransition>
  );
}
