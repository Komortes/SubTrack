import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { InteractionManager, Platform } from "react-native";

type NotificationData = {
  subscriptionId?: unknown;
  subscription_id?: unknown;
};

export function useNotificationRouting() {
  useEffect(() => {
    if (Platform.OS === "web") return;
    function openFromResponse(response: Notifications.NotificationResponse | null) {
      const subscriptionId = getSubscriptionId(response);
      if (!subscriptionId) return;

      InteractionManager.runAfterInteractions(() => {
        router.push(`/(app)/(tabs)/subscriptions/${subscriptionId}`);
      });
    }

    openFromResponse(Notifications.getLastNotificationResponse());
    Notifications.clearLastNotificationResponse();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromResponse(response);
      Notifications.clearLastNotificationResponse();
    });

    return () => {
      subscription.remove();
    };
  }, []);
}

function getSubscriptionId(response: Notifications.NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as NotificationData | undefined;
  const id = data?.subscriptionId ?? data?.subscription_id;

  return typeof id === "string" && id.length > 0 ? id : null;
}
