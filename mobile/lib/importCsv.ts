import { File } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { Subscription } from "@/lib/types";

type ImportResult = {
  subscriptions: Subscription[];
  skipped: number;
};

export async function pickSubscriptionsCsv(): Promise<ImportResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["text/csv", "text/comma-separated-values", "application/csv", "text/*"],
    copyToCacheDirectory: true,
    multiple: false
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  const file = new File(result.assets[0].uri);
  return parseSubscriptionsCsv(await file.text());
}

export function parseSubscriptionsCsv(csv: string): ImportResult {
  const rows = parseCsvRows(csv).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length < 2) {
    return { subscriptions: [], skipped: 0 };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const subscriptions: Subscription[] = [];
  let skipped = 0;

  for (const row of rows.slice(1)) {
    const record = Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]));
    const subscription = toSubscription(record);

    if (subscription) {
      subscriptions.push(subscription);
    } else {
      skipped += 1;
    }
  }

  return { subscriptions, skipped };
}

function toSubscription(record: Record<string, string>): Subscription | null {
  const amount = Number(record.amount?.replace(",", "."));
  const name = record.name;
  const renewalDate = record.renewal_date;
  const billingPeriod = record.billing_period as Subscription["billingPeriod"];
  const category = record.category as Subscription["category"];
  const currency = (record.currency || "CZK") as Subscription["currency"];

  if (!name || Number.isNaN(amount) || amount <= 0 || !renewalDate || !isBillingPeriod(billingPeriod) || !isCategory(category) || !isCurrency(currency)) {
    return null;
  }

  return {
    id: record.id || createLocalId(),
    name,
    amount,
    currency,
    billingPeriod,
    customPeriodDays: record.custom_period_days ? Number(record.custom_period_days) : undefined,
    renewalDate: renewalDate.slice(0, 10),
    category,
    iconSlug: record.icon_slug || undefined,
    color: record.color || "#0F766E",
    notes: record.notes || undefined,
    isActive: record.is_active ? record.is_active.toLowerCase() !== "false" : true,
    isTrial: false,
    isArchived: false,
    cancelReminderDays: null,
    createdAt: record.created_at || new Date().toISOString()
  };
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}

function isBillingPeriod(value: string): value is Subscription["billingPeriod"] {
  return ["weekly", "monthly", "yearly", "custom"].includes(value);
}

function isCategory(value: string): value is Subscription["category"] {
  return ["entertainment", "work", "cloud", "health", "other"].includes(value);
}

function isCurrency(value: string): value is Subscription["currency"] {
  return ["CZK", "EUR", "USD"].includes(value);
}

function createLocalId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const resolved = char === "x" ? value : (value & 0x3) | 0x8;
    return resolved.toString(16);
  });
}
