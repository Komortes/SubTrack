import { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ServiceIcon } from "@/components/ServiceIcon";
import { categoryLabels } from "@/lib/catalog";
import { formatDate, formatShortDate, toLocalDate, toLocalIsoDate } from "@/lib/dateFormat";
import { shareSubscriptionCsv } from "@/lib/exportCsv";
import { daysUntil, formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

function subtractDays(dateStr: string, days: number): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() - days);
  return toLocalIsoDate(d);
}

export default function SubscriptionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);
  const refreshSubscription = useSubscriptionStore((state) => state.refreshSubscription);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const dateFormat = useSettingsStore((state) => state.dateFormat);

  useEffect(() => {
    if (id && !isOfflineMode) {
      refreshSubscription(id).catch(() => undefined);
    }
  }, [id, isOfflineMode, refreshSubscription]);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-lg font-semibold text-ink">Подписка не найдена</Text>
      </View>
    );
  }

  const currentSubscription = subscription;
  const periodDays =
    currentSubscription.billingPeriod === "weekly" ? 7
    : currentSubscription.billingPeriod === "monthly" ? 30
    : currentSubscription.billingPeriod === "yearly" ? 365
    : (currentSubscription.customPeriodDays ?? 30);

  const daysLeft = daysUntil(currentSubscription.renewalDate);
  const progress = Math.max(0, Math.min(1, 1 - daysLeft / periodDays));
  const previousDateStr = subtractDays(currentSubscription.renewalDate, periodDays);
  const monthlyAmount = normalizeMonthlyAmount(currentSubscription);
  const subscriptionId = currentSubscription.id;
  const subscriptionName = currentSubscription.name;
  const renewalBadge =
    daysLeft === 0 ? "Сегодня"
    : daysLeft < 0 ? `Просрочено на ${Math.abs(daysLeft)} дн.`
    : `Через ${daysLeft} дн.`;

  function confirmDeleteSubscription() {
    Alert.alert("Удалить подписку?", `${subscriptionName} будет удалена из списка.`, [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: () => {
          deleteSubscription(subscriptionId);
          router.back();
        }
      }
    ]);
  }

  function confirmMarkPaid() {
    Alert.alert("Отметить оплату?", `Следующая дата списания для ${subscriptionName} будет перенесена.`, [
      { text: "Отмена", style: "cancel" },
      { text: "Отметить", onPress: () => markPaid(subscriptionId).catch(() => undefined) }
    ]);
  }

  function toggleActive() {
    updateSubscription(subscriptionId, { isActive: !currentSubscription.isActive }).catch(() => undefined);
  }

  async function exportSubscription() {
    try {
      await shareSubscriptionCsv(currentSubscription);
    } catch {
      Alert.alert("Не удалось экспортировать", "Попробуй ещё раз позже.");
    }
  }

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
          {!subscription.isActive ? (
            <View className="mt-2 rounded-full border border-danger/30 bg-danger/10 px-3 py-1">
              <Text className="text-xs font-semibold uppercase tracking-widest text-danger">Приостановлена</Text>
            </View>
          ) : null}
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
              <Text className="text-xl font-bold text-ink">{formatDate(subscription.renewalDate, dateFormat)}</Text>
              <View className={`rounded-full border px-3 py-1 ${daysLeft <= 0 ? "border-danger/30 bg-danger/10" : "border-border bg-bg"}`}>
                <Text className={`text-xs ${daysLeft <= 0 ? "font-semibold text-danger" : "text-muted"}`}>
                  {renewalBadge}
                </Text>
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
              onPress={confirmMarkPaid}
            >
              <Text className="font-semibold uppercase tracking-widest text-ink" style={{ fontSize: 11, letterSpacing: 1.5 }}>
                Отметить оплаченной
              </Text>
            </AnimatedPressable>
          </FadeInView>

          {subscription.notes ? (
            <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">Заметки</Text>
              <Text className="mt-3 text-sm leading-5 text-subtle">{subscription.notes}</Text>
            </FadeInView>
          ) : null}

          {/* Payment history */}
          <FadeInView index={subscription.notes ? 4 : 3} className="rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">История платежей</Text>
            {subscription.paymentHistory?.length ? (
              <View className="mt-3 gap-3">
                {subscription.paymentHistory.slice(0, 5).map((record) => (
                  <View key={record.id} className="flex-row items-center justify-between">
                    <View>
                      <Text className="font-semibold text-ink">{formatShortDate(record.paidAt.slice(0, 10))}</Text>
                      <Text className="mt-0.5 text-xs text-muted">Оплачено вручную</Text>
                    </View>
                    <Text className="font-bold text-ink">{formatMoney(record.amount, record.currency)}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-subtle">Пока нет сохранённой истории.</Text>
            )}
          </FadeInView>

          {/* Actions */}
          <FadeInView index={subscription.notes ? 5 : 4} className="gap-3 pb-4">
            <AnimatedPressable
              className="rounded-2xl bg-accent px-5 py-4"
              onPress={toggleActive}
            >
              <Text className="text-center font-semibold text-bg">
                {subscription.isActive ? "Приостановить подписку" : "Возобновить подписку"}
              </Text>
            </AnimatedPressable>

            <View className="flex-row gap-3">
              <AnimatedPressable
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-4"
                onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}/edit`)}
              >
                <Text className="text-center font-semibold text-ink">Редактировать</Text>
              </AnimatedPressable>
              <AnimatedPressable
                className="flex-1 rounded-2xl border border-border bg-surface px-4 py-4"
                onPress={exportSubscription}
              >
                <Text className="text-center font-semibold text-ink">Экспорт</Text>
              </AnimatedPressable>
            </View>

            <AnimatedPressable
              className="rounded-2xl border border-danger/20 bg-surface px-5 py-4"
              onPress={confirmDeleteSubscription}
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
