import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ServiceIcon } from "@/components/ServiceIcon";
import { categoryLabels } from "@/lib/catalog";
import { daysUntil, formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const RU_MONTHS_SHORT = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()} ${RU_MONTHS_SHORT[d.getMonth()]}`;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function SubscriptionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-lg font-semibold text-ink">Подписка не найдена</Text>
      </View>
    );
  }

  const periodDays =
    subscription.billingPeriod === "weekly" ? 7
    : subscription.billingPeriod === "monthly" ? 30
    : subscription.billingPeriod === "yearly" ? 365
    : (subscription.customPeriodDays ?? 30);

  const daysLeft = daysUntil(subscription.renewalDate);
  const progress = Math.max(0, Math.min(1, 1 - daysLeft / periodDays));
  const previousDateStr = subtractDays(subscription.renewalDate, periodDays);
  const monthlyAmount = normalizeMonthlyAmount(subscription);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "SubTrack",
          headerStyle: { backgroundColor: "#0a0a0a" },
          headerTintColor: "#fafafa"
        }}
      />
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-10">

        {/* Hero — icon + name + category + price */}
        <FadeInView className="items-center px-5 pb-6 pt-8">
          <ServiceIcon name={subscription.name} iconSlug={subscription.iconSlug} color={subscription.color} size={80} />
          <Text className="mt-5 text-2xl font-bold tracking-tight text-ink">{subscription.name}</Text>
          <View className="mt-2 flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
              {categoryLabels[subscription.category] ?? subscription.category}
            </Text>
          </View>
          <Text className="mt-5 text-5xl font-bold tracking-tighter text-ink">
            {formatMoney(subscription.amount, subscription.currency)}
          </Text>
          <Text className="mt-1.5 text-sm text-subtle">
            Эквивалент {formatMoney(monthlyAmount, subscription.currency)}/мес
          </Text>
        </FadeInView>

        <View className="gap-3 px-5">

          {/* Next billing + progress */}
          <FadeInView index={1} className="rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Следующее списание</Text>
            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-ink">{formatShortDate(subscription.renewalDate)}</Text>
              <View className="rounded-full border border-border bg-bg px-3 py-1">
                <Text className="text-xs text-muted">Через {daysLeft} дн.</Text>
              </View>
            </View>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <View className="h-1.5 rounded-full bg-ink" style={{ width: `${progress * 100}%` }} />
            </View>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-muted">{formatShortDate(previousDateStr)}</Text>
              <Text className="text-xs text-muted">{formatShortDate(subscription.renewalDate)}</Text>
            </View>
          </FadeInView>

          {/* Billing actions */}
          <FadeInView index={2} className="flex-row gap-2">
            <AnimatedPressable
              className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface"
              onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}/edit`)}
            >
              <Feather name="calendar" size={20} color="#a3a3a3" />
            </AnimatedPressable>
            <AnimatedPressable
              className="flex-1 items-center justify-center rounded-2xl border border-border bg-surface"
              onPress={() => markPaid(subscription.id)}
            >
              <Text className="font-semibold uppercase tracking-widest text-ink" style={{ fontSize: 11, letterSpacing: 1.5 }}>
                Пропустить платеж
              </Text>
            </AnimatedPressable>
          </FadeInView>

          {/* Payment history */}
          <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">История платежей</Text>
            <Text className="mt-3 text-sm text-subtle">Пока нет сохранённой истории.</Text>
          </FadeInView>

          {/* Actions */}
          <FadeInView index={4} className="gap-3 pb-4">
            <AnimatedPressable
              className="rounded-2xl bg-accent px-5 py-4"
              onPress={() => updateSubscription(subscription.id, { isActive: !subscription.isActive })}
            >
              <Text className="text-center font-semibold text-bg">
                {subscription.isActive ? "Отменить подписку" : "Возобновить подписку"}
              </Text>
            </AnimatedPressable>

            <View className="flex-row gap-3">
              <AnimatedPressable
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-4"
                onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}/edit`)}
              >
                <Text className="text-center font-semibold text-ink">Редактировать</Text>
              </AnimatedPressable>
              <AnimatedPressable className="flex-1 rounded-2xl border border-border bg-surface px-4 py-4">
                <Text className="text-center font-semibold text-ink">Экспорт</Text>
              </AnimatedPressable>
            </View>

            <AnimatedPressable
              className="rounded-2xl border border-danger/20 bg-surface px-5 py-4"
              onPress={() => {
                deleteSubscription(subscription.id);
                router.back();
              }}
            >
              <Text className="text-center text-xs font-semibold uppercase tracking-widest text-danger">
                Удалить подписку
              </Text>
            </AnimatedPressable>
          </FadeInView>

        </View>
      </ScrollView>
    </>
  );
}
