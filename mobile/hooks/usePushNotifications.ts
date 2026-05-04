import { useCallback, useState } from "react";
import { registerForPushNotifications, sendLocalTestNotification } from "@/lib/notifications";

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);

  const register = useCallback(async () => {
    const token = await registerForPushNotifications();
    setExpoPushToken(token);
    return token;
  }, []);

  return {
    expoPushToken,
    register,
    sendTestNotification: sendLocalTestNotification
  };
}

