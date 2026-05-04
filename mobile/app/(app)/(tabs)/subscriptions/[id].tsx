import { Stack, useLocalSearchParams, router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ServiceIcon } from "@/components/ServiceIcon";
import { formatMoney, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function SubscriptionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-ink">Подписка не найдена</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: subscription.name }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-5 px-5 pb-10 pt-5">
        <View className="items-center rounded-3xl bg-white p-6">
          <ServiceIcon
            name={subscription.name}
            iconSlug={subscription.iconSlug}
            color={subscription.color}
            size={72}
          />
          <Text className="mt-4 text-2xl font-bold text-ink">{subscription.name}</Text>
          <Text className="mt-2 text-muted">{subscription.category}</Text>
        </View>
        <View className="rounded-2xl border border-line bg-white p-4">
          <Text className="text-sm text-muted">Стоимость</Text>
          <Text className="mt-1 text-2xl font-bold text-ink">
            {formatMoney(subscription.amount, subscription.currency)}
          </Text>
          <Text className="mt-1 text-sm text-muted">
            Эквивалент {formatMoney(normalizeMonthlyAmount(subscription), subscription.currency)}/мес
          </Text>
        </View>
        <View className="rounded-2xl border border-line bg-white p-4">
          <Text className="text-sm text-muted">Следующее списание</Text>
          <Text className="mt-1 text-lg font-semibold text-ink">{subscription.renewalDate}</Text>
        </View>
        <View className="rounded-2xl border border-line bg-white p-4">
          <Text className="text-base font-semibold text-ink">История оплат</Text>
          <Text className="mt-2 text-sm text-muted">Пока нет сохраненной истории.</Text>
        </View>
        <View className="gap-3">
          <Pressable className="rounded-2xl bg-accent px-5 py-4" onPress={() => markPaid(subscription.id)}>
            <Text className="text-center font-semibold text-white">Отметить оплаченной</Text>
          </Pressable>
          <Pressable
            className="rounded-2xl bg-white px-5 py-4"
            onPress={() => updateSubscription(subscription.id, { isActive: !subscription.isActive })}
          >
            <Text className="text-center font-semibold text-ink">
              {subscription.isActive ? "Приостановить" : "Возобновить"}
            </Text>
          </Pressable>
          <Pressable
            className="rounded-2xl bg-red-50 px-5 py-4"
            onPress={() => {
              deleteSubscription(subscription.id);
              router.back();
            }}
          >
            <Text className="text-center font-semibold text-danger">Удалить</Text>
          </Pressable>
        </View>
      </ScrollView>
    </>
  );
}

