import { Stack, router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-lg font-semibold text-ink">Подписка не найдена</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Редактировать" }} />
      <SubscriptionForm
        initialValue={subscription}
        submitLabel="Сохранить изменения"
        onSubmit={(value) => {
          updateSubscription(subscription.id, value);
          router.back();
        }}
      />
    </>
  );
}
