import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CategoryPie } from "@/components/CategoryPie";
import { MonthlyChart } from "@/components/MonthlyChart";
import { formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAnalytics } from "@/hooks/useAnalytics";

const periods = ["Месяц", "Квартал", "Год"] as const;

export default function StatsScreen() {
  const [period, setPeriod] = useState<(typeof periods)[number]>("Месяц");
  const { monthlyTotal, activeCount, byCategory, topSubscriptions } = useAnalytics();

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-5 px-5 pb-10 pt-16">
      <Text className="text-3xl font-bold text-ink">Аналитика</Text>
      <View className="flex-row rounded-2xl bg-white p-1">
        {periods.map((item) => (
          <Pressable
            key={item}
            className={`flex-1 rounded-xl py-3 ${period === item ? "bg-ink" : ""}`}
            onPress={() => setPeriod(item)}
          >
            <Text className={period === item ? "text-center font-semibold text-white" : "text-center font-semibold text-muted"}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="flex-row gap-3">
        <View className="flex-1 rounded-2xl bg-white p-4">
          <Text className="text-xs text-muted">Всего</Text>
          <Text className="mt-2 text-lg font-bold text-ink">{formatMoney(monthlyTotal)}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white p-4">
          <Text className="text-xs text-muted">Среднее</Text>
          <Text className="mt-2 text-lg font-bold text-ink">{formatMoney(monthlyTotal)}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-white p-4">
          <Text className="text-xs text-muted">Кол-во</Text>
          <Text className="mt-2 text-lg font-bold text-ink">{activeCount}</Text>
        </View>
      </View>
      <MonthlyChart monthlyTotal={monthlyTotal} />
      <CategoryPie values={byCategory} />
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="text-base font-semibold text-ink">Топ подписок</Text>
        {topSubscriptions.map((item) => (
          <View key={item.id} className="mt-3 flex-row justify-between">
            <Text className="text-ink">{item.name}</Text>
            <Text className="font-semibold text-ink">
              {formatMoney(normalizeMonthlyAmount(item), item.currency)}/мес
            </Text>
          </View>
        ))}
      </View>
      <View className="rounded-2xl bg-ink p-4">
        <Text className="text-sm text-white/70">Прогноз</Text>
        <Text className="mt-2 text-xl font-bold text-white">
          В следующем месяце ожидается {formatMoney(monthlyTotal)}
        </Text>
      </View>
    </ScrollView>
  );
}

