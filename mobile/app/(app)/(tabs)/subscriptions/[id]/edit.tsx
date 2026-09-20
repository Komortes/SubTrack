import { Stack, router, useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { SubscriptionForm } from "@/components/SubscriptionForm";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export default function EditSubscriptionScreen() {
  const { t } = useTranslation();
  const { id, convertTrial } = useLocalSearchParams<{ id: string; convertTrial?: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-lg font-semibold text-ink">{t("home.noSubscriptions")}</Text>
      </View>
    );
  }

  const initialValue = convertTrial === "1"
    ? { ...subscription, isTrial: false }
    : subscription;

  const title = convertTrial === "1" ? t("subscriptions.detail.convertTrial") : t("subscriptionForm.editTitle");
  const submitLabel = t("subscriptionForm.saveButton");

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title }} />
      <SubscriptionForm
        initialValue={initialValue}
        submitLabel={submitLabel}
        onSubmit={async (value) => {
          await updateSubscription(subscription.id, value);
          router.back();
        }}
      />
    </>
  );
}
