import { Stack, router } from "expo-router";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function NewSubscriptionScreen() {
  const createSubscription = useSubscriptionStore((state) => state.createSubscription);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Добавить" }} />
      <SubscriptionForm
        submitLabel="Сохранить"
        onSubmit={async (value) => {
          await createSubscription({ ...value, isActive: true });
          router.back();
        }}
      />
    </>
  );
}
