import { useCallback, useState } from "react";
import { Platform } from "react-native";
import * as api from "@/lib/api";
import { registerForPushNotifications, sendLocalTestNotification } from "@/lib/notifications";

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const register = useCallback(async () => {
    const token = await registerForPushNotifications();
    setExpoPushToken(token);
    if (token && Platform.OS !== "web") {
      await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android");
    }
    return token;
  }, []);

  return {
    expoPushToken,
    register,
    sendTestNotification: sendLocalTestNotification
  };
}
