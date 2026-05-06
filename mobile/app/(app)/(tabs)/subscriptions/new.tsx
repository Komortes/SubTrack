import { Stack, router } from "expo-router";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useAuthStore } from "@/store/authStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function NewSubscriptionScreen() {
  const addSubscription = useSubscriptionStore((state) => state.addSubscription);
  const createSubscription = useSubscriptionStore((state) => state.createSubscription);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Добавить" }} />
      <SubscriptionForm
        submitLabel="Сохранить"
        onSubmit={async (value) => {
          if (!isOfflineMode) {
            await createSubscription({ ...value, isActive: true });
            router.back();
            return;
          }

          addSubscription({
            ...value,
            id: `${value.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            isActive: true,
            createdAt: new Date().toISOString()
          });
          router.back();
        }}
      />
    </>
  );
}
