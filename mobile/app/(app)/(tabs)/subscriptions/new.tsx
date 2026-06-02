import { Stack, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function NewSubscriptionScreen() {
  const { t } = useTranslation();
  const createSubscription = useSubscriptionStore((state) => state.createSubscription);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: t("subscriptionForm.newTitle") }} />
      <SubscriptionForm
        submitLabel={t("subscriptionForm.saveButton")}
        onSubmit={async (value) => {
          await createSubscription({ ...value, isActive: true });
          router.back();
        }}
      />
    </>
  );
}
