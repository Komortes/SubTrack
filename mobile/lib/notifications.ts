import * as Notifications from "expo-notifications";

export async function registerForPushNotifications(): Promise<string | null> {
  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  const finalStatus =
    currentStatus === "granted"
      ? currentStatus
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  return token.data;
}

export async function sendLocalTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "SubTrack",
      body: "Тестовое уведомление работает."
    },
    trigger: null
  });
}

