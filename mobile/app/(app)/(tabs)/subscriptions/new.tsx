import { Stack, router } from "expo-router";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { Subscription } from "@/lib/types";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function NewSubscriptionScreen() {
  const addSubscription = useSubscriptionStore((state) => state.addSubscription);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Добавить" }} />
      <SubscriptionForm
        submitLabel="Сохранить"
        onSubmit={(value) => {
          const subscription: Subscription = {
            ...value,
            id: `${value.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            isActive: true,
            createdAt: new Date().toISOString()
          };

          addSubscription(subscription);
          router.back();
        }}
      />
    </>
  );
}
