import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Share } from "react-native";
import { Subscription } from "./types";

const headers = [
  "name",
  "amount",
  "currency",
  "billing_period",
  "custom_period_days",
  "renewal_date",
  "category",
  "is_active",
  "notes"
];

export function subscriptionsToCsv(subscriptions: Subscription[]): string {
  const rows = subscriptions.map((subscription) => [
    subscription.name,
    subscription.amount,
    subscription.currency,
    subscription.billingPeriod,
    subscription.customPeriodDays ?? "",
    subscription.renewalDate,
    subscription.category,
    subscription.isActive ? "true" : "false",
    subscription.notes ?? ""
  ]);

  return [headers, ...rows].map((row) => row.map(escapeCsvValue).join(",")).join("\n");
}

export async function shareSubscriptionsCsv(subscriptions: Subscription[]): Promise<void> {
  const csv = subscriptionsToCsv(subscriptions);
  await shareCsv(csv, `subtrack-subscriptions-${new Date().toISOString().slice(0, 10)}.csv`);
}

export async function shareSubscriptionCsv(subscription: Subscription): Promise<void> {
  const safeName = subscription.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const csv = subscriptionsToCsv([subscription]);
  await shareCsv(csv, `subtrack-${safeName || "subscription"}.csv`);
}

async function shareCsv(csv: string, fileName: string): Promise<void> {
  const file = new File(Paths.cache, fileName);

  if (await Sharing.isAvailableAsync()) {
    file.write(csv);
    await Sharing.shareAsync(file.uri, {
      mimeType: "text/csv",
      dialogTitle: "SubTrack CSV",
      UTI: "public.comma-separated-values-text"
    });
    return;
  }

  await Share.share({
    title: "SubTrack CSV",
    message: csv
  });
}

function escapeCsvValue(value: string | number): string {
  const text = String(value);

  if (!/[",\n]/.test(text)) {
    return text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}
