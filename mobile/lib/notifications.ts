import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { UserSettings } from "@/lib/api";
import { formatMoney } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";

const PUSH_TOKEN_KEY = "subtrack_expo_push_token";
const LOCAL_RENEWAL_PREFIX = "subtrack-renewal";
const MAX_LOCAL_RENEWALS = 60;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotifications(): Promise<string | null> {
  await ensureNotificationChannel();

  const finalStatus = await requestNotificationPermission();

  if (finalStatus !== "granted") {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync();
  await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token.data);
  return token.data;
}

export async function getStoredPushToken(): Promise<string | null> {
  return SecureStore.getItemAsync(PUSH_TOKEN_KEY);
}

export async function clearStoredPushToken(): Promise<void> {
  await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY);
}

export async function sendLocalTestNotification(): Promise<void> {
  await ensureNotificationChannel();
  const finalStatus = await requestNotificationPermission();
  if (finalStatus !== "granted") return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "SubTrack",
      body: "Test notification is working.",
      data: { type: "test" }
    },
    identifier: `subtrack-test-${Date.now()}`,
    trigger: null
  });
}

export async function clearLocalRenewalNotifications(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((item) =>
        item.identifier.startsWith(LOCAL_RENEWAL_PREFIX) ||
        item.identifier.startsWith("subtrack-trial-") ||
        item.identifier.startsWith("subtrack-cancel-")
      )
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier))
  );
}

export async function syncLocalRenewalNotifications(
  subscriptions: Subscription[],
  settings: Pick<
    UserSettings,
    "notifyThreeDays" | "notifyOneDay" | "notifySameDay" | "notificationTime"
  >,
  options: { requestPermission?: boolean } = {}
): Promise<number> {
  await clearLocalRenewalNotifications();

  const offsets = [
    settings.notifyThreeDays ? 3 : null,
    settings.notifyOneDay ? 1 : null,
    settings.notifySameDay ? 0 : null
  ].filter((item): item is number => item !== null);

  const active = subscriptions.filter((item) => item.isActive && !item.isArchived);
  const renewalActive = active.filter((item) => !item.isTrial);

  // Only exit early if there's nothing to schedule at all
  if (active.length === 0) {
    return 0;
  }

  await ensureNotificationChannel();
  const finalStatus = options.requestPermission
    ? await requestNotificationPermission()
    : (await Notifications.getPermissionsAsync()).status;
  if (finalStatus !== "granted") {
    return 0;
  }

  // Renewal notifications — only when offsets are configured
  const candidates = offsets.length > 0
    ? renewalActive
        .flatMap((subscription) =>
          offsets.map((offset) => ({
            subscription,
            offset,
            triggerDate: buildReminderDate(subscription.renewalDate, offset, settings.notificationTime)
          }))
        )
        .filter((item) => item.triggerDate.getTime() > Date.now())
        .sort((a, b) => a.triggerDate.getTime() - b.triggerDate.getTime())
        .slice(0, MAX_LOCAL_RENEWALS)
    : [];

  if (candidates.length > 0) {
    await Promise.all(
      candidates.map(({ subscription, offset, triggerDate }) =>
        Notifications.scheduleNotificationAsync({
          identifier: `${LOCAL_RENEWAL_PREFIX}-${subscription.id}-${offset}`,
          content: {
            title: offset === 0 ? "💳 Renewal today" : `📅 Renewal in ${offset} day${offset === 1 ? "" : "s"}`,
            body: `${subscription.name}: ${formatMoney(subscription.amount, subscription.currency)}`,
            data: {
              type: "renewal",
              subscriptionId: subscription.id,
              offset
            }
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: "renewals"
          }
        })
      )
    );
  }

  // Trial-end notifications
  const trialCandidates = active
    .filter((item) => item.isTrial)
    .flatMap((subscription) => [
      {
        identifier: `subtrack-trial-${subscription.id}-2d`,
        triggerDate: buildReminderDate(subscription.renewalDate, 2, settings.notificationTime),
        title: "⏳ Trial ends the day after tomorrow",
        body: `${subscription.name} — cancel or start paying?`,
        subscriptionId: subscription.id
      },
      {
        identifier: `subtrack-trial-${subscription.id}-1d`,
        triggerDate: buildReminderDate(subscription.renewalDate, 1, settings.notificationTime),
        title: "⚠️ Last day of trial",
        body: `${subscription.name} — last chance to cancel today`,
        subscriptionId: subscription.id
      }
    ])
    .filter((item) => item.triggerDate.getTime() > Date.now());

  await Promise.all(
    trialCandidates.map(({ identifier, triggerDate, title, body, subscriptionId }) =>
      Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: "trial", subscriptionId }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: "renewals"
        }
      })
    )
  );

  // Cancel-reminder notifications
  const cancelCandidates = renewalActive
    .filter((item) => item.cancelReminderDays != null)
    .map((subscription) => ({
      identifier: `subtrack-cancel-${subscription.id}`,
      triggerDate: buildReminderDate(
        subscription.renewalDate,
        subscription.cancelReminderDays!,
        settings.notificationTime
      ),
      title: "🔔 Cancel reminder",
      body: `In ${subscription.cancelReminderDays}d: ${subscription.name} charges ${formatMoney(subscription.amount, subscription.currency)}`,
      subscriptionId: subscription.id
    }))
    .filter((item) => item.triggerDate.getTime() > Date.now());

  await Promise.all(
    cancelCandidates.map(({ identifier, triggerDate, title, body, subscriptionId }) =>
      Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title,
          body,
          data: { type: "cancel-reminder", subscriptionId }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: "renewals"
        }
      })
    )
  );

  return candidates.length + trialCandidates.length + cancelCandidates.length;
}

async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync("renewals", {
    name: "Renewal reminders",
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#fafafa"
  });
}

async function requestNotificationPermission(): Promise<Notifications.PermissionStatus> {
  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  return currentStatus === "granted"
    ? currentStatus
    : (await Notifications.requestPermissionsAsync()).status;
}

function buildReminderDate(renewalDate: string, offsetDays: number, time: string): Date {
  const [hours = "9", minutes = "0"] = time.split(":");
  const date = new Date(`${renewalDate}T00:00:00`);
  date.setDate(date.getDate() - offsetDays);
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date;
}
