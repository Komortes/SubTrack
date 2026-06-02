import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { PaymentRecord, Subscription } from "./types";

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api");
const TOKEN_KEY = "subtrack_token";
const REQUEST_TIMEOUT_MS = 12000;

type ApiUser = {
  id: number;
  email: string;
  name?: string | null;
  avatar_url?: string | null;
  last_synced_at?: string | null;
};

type AuthResponse = {
  token: string;
  user: ApiUser;
};

export type AnalyticsSummary = {
  monthlyTotal: number;
  yearlyTotal: number;
  activeCount: number;
  byCategory: Record<string, number>;
};

export type MonthlyAnalyticsPoint = {
  key: string;
  label: string;
  total: number;
};

type ApiAnalyticsSummary = {
  monthly_total: number;
  yearly_total: number;
  active_count: number;
  by_category: Record<string, number>;
};

type ApiMonthlyAnalytics = {
  months: Array<{
    key: string;
    label: string;
    total: number;
  }>;
};

export type UserSettings = {
  notifyThreeDays: boolean;
  notifyOneDay: boolean;
  notifySameDay: boolean;
  notificationTime: string;
  primaryCurrency: Subscription["currency"];
  dateFormat: "DD.MM.YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";
  theme: "light" | "dark" | "system";
};

type ApiUserSettings = {
  notify_three_days: boolean;
  notify_one_day: boolean;
  notify_same_day: boolean;
  notification_time: string;
  primary_currency: UserSettings["primaryCurrency"];
  date_format: UserSettings["dateFormat"];
  theme: UserSettings["theme"];
};

type ApiSubscription = {
  id: string;
  name: string;
  amount: string | number;
  currency: Subscription["currency"];
  billing_period: Subscription["billingPeriod"];
  custom_period_days?: number | null;
  renewal_date: string;
  category: Subscription["category"];
  icon_slug?: string | null;
  color?: string | null;
  notes?: string | null;
  is_active: boolean;
  is_trial: boolean;
  is_archived: boolean;
  cancel_reminder_days?: number | null;
  created_at: string;
  payment_records?: ApiPaymentRecord[];
};

type ApiPaymentRecord = {
  id: string;
  subscription_id: string;
  paid_at: string;
  amount: string | number;
  currency: Subscription["currency"];
};

type SubscriptionPayload = Omit<Subscription, "createdAt"> | Omit<Subscription, "id" | "createdAt">;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  let lastNetworkError: unknown;
  for (const baseUrl of getApiBaseUrls()) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}${path}`, {
        ...options,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });

      if (!response.ok) {
        const message = await readErrorMessage(response);
        throw new ApiError(message, response.status);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastNetworkError = error;
    }
  }

  const detail = lastNetworkError instanceof Error ? lastNetworkError.message : "network request failed";
  throw new ApiError(
    `Could not connect to server (${detail}). Check EXPO_PUBLIC_API_URL and start backend with --host=0.0.0.0.`,
    0
  );
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

function getApiBaseUrls(): string[] {
  const urls = [API_URL];
  const expoHost = Constants.expoConfig?.hostUri?.split(":")[0];

  if (isLocalhostUrl(API_URL)) {
    if (expoHost) urls.push(`http://${expoHost}:8000/api`);
    urls.push("http://10.0.2.2:8000/api");
  } else if (expoHost) {
    // When a hardcoded LAN IP is configured, also try the Expo Metro host with
    // the same port and path — this auto-recovers when DHCP changes the IP.
    const port = extractPort(API_URL) ?? "8000";
    const apiPath = extractApiPath(API_URL) ?? "/api";
    urls.push(`http://${expoHost}:${port}${apiPath}`);
  }

  return Array.from(new Set(urls.map(normalizeApiUrl)));
}

function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

function isLocalhostUrl(url: string): boolean {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(url);
}

function extractPort(url: string): string | null {
  const match = url.match(/^https?:\/\/[^/:]+:(\d+)/);
  return match?.[1] ?? null;
}

function extractApiPath(url: string): string | null {
  const match = url.match(/^https?:\/\/[^/]+(\/.*)/);
  return match?.[1] ?? null;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function socialLogin(provider: "google", idToken: string, name?: string | null): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/social", {
    method: "POST",
    body: JSON.stringify({
      provider,
      id_token: idToken,
      name
    })
  });
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function me(): Promise<ApiUser> {
  return apiRequest<ApiUser>("/auth/me");
}

export async function deleteAccount(): Promise<void> {
  await apiRequest<void>("/account", { method: "DELETE" });
}

export async function fetchSettings(): Promise<UserSettings> {
  const settings = await apiRequest<ApiUserSettings>("/settings");
  return fromApiSettings(settings);
}

export async function updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
  const settings = await apiRequest<ApiUserSettings>("/settings", {
    method: "PUT",
    body: JSON.stringify(toApiSettings(patch))
  });

  return fromApiSettings(settings);
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary> {
  const summary = await apiRequest<ApiAnalyticsSummary>("/analytics/summary");
  return {
    monthlyTotal: Number(summary.monthly_total),
    yearlyTotal: Number(summary.yearly_total),
    activeCount: Number(summary.active_count),
    byCategory: summary.by_category
  };
}

export async function fetchMonthlyAnalytics(): Promise<MonthlyAnalyticsPoint[]> {
  const analytics = await apiRequest<ApiMonthlyAnalytics>("/analytics/monthly");
  return analytics.months.map((item) => ({
    key: item.key,
    label: item.label,
    total: Number(item.total)
  }));
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await apiRequest<ApiSubscription[]>("/subscriptions");
  return subscriptions.map(fromApiSubscription);
}

export async function fetchSubscription(id: string): Promise<Subscription> {
  const subscription = await apiRequest<ApiSubscription>(`/subscriptions/${id}`);
  return fromApiSubscription(subscription);
}

export async function createSubscription(subscription: Omit<Subscription, "createdAt"> | Omit<Subscription, "id" | "createdAt">): Promise<Subscription> {
  const created = await apiRequest<ApiSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(toApiSubscription(subscription))
  });

  return fromApiSubscription(created);
}

export async function updateSubscription(id: string, patch: Partial<Omit<Subscription, "id" | "createdAt">>): Promise<Subscription> {
  const updated = await apiRequest<ApiSubscription>(`/subscriptions/${id}`, {
    method: "PUT",
    body: JSON.stringify(toApiSubscription(patch, { includeId: false }))
  });

  return fromApiSubscription(updated);
}

export async function deleteSubscription(id: string): Promise<void> {
  await apiRequest<void>(`/subscriptions/${id}`, { method: "DELETE" });
}

export async function deleteAllSubscriptions(): Promise<void> {
  await apiRequest<void>("/subscriptions", { method: "DELETE" });
}

export async function registerPushToken(token: string, platform: "ios" | "android"): Promise<void> {
  await apiRequest<void>("/push-tokens", {
    method: "POST",
    body: JSON.stringify({ token, platform })
  });
}

export async function deletePushToken(token: string): Promise<void> {
  await apiRequest<void>("/push-tokens", {
    method: "DELETE",
    body: JSON.stringify({ token })
  });
}

export async function renewSubscription(id: string): Promise<Subscription> {
  const renewed = await apiRequest<ApiSubscription>(`/subscriptions/${id}/renew`, {
    method: "POST"
  });

  return fromApiSubscription(renewed);
}

function fromApiSubscription(subscription: ApiSubscription): Subscription {
  return {
    id: subscription.id,
    name: subscription.name,
    amount: Number(subscription.amount),
    currency: subscription.currency,
    billingPeriod: subscription.billing_period,
    customPeriodDays: subscription.custom_period_days ?? undefined,
    renewalDate: subscription.renewal_date.slice(0, 10),
    category: subscription.category,
    iconSlug: subscription.icon_slug ?? undefined,
    color: subscription.color ?? "#0F766E",
    notes: subscription.notes ?? undefined,
    isActive: subscription.is_active,
    isTrial: subscription.is_trial ?? false,
    isArchived: subscription.is_archived ?? false,
    cancelReminderDays: subscription.cancel_reminder_days ?? null,
    createdAt: subscription.created_at,
    paymentHistory: subscription.payment_records?.map(fromApiPaymentRecord)
  };
}

function fromApiPaymentRecord(record: ApiPaymentRecord): PaymentRecord {
  return {
    id: record.id,
    subscriptionId: record.subscription_id,
    paidAt: record.paid_at,
    amount: Number(record.amount),
    currency: record.currency
  };
}

export function toApiSubscription(subscription: Partial<SubscriptionPayload>, options: { includeId?: boolean } = {}) {
  const includeId = options.includeId ?? true;
  return {
    id: includeId && "id" in subscription && isUuid(subscription.id) ? subscription.id : undefined,
    name: subscription.name,
    amount: subscription.amount,
    currency: subscription.currency,
    billing_period: subscription.billingPeriod,
    custom_period_days: subscription.customPeriodDays,
    renewal_date: subscription.renewalDate,
    category: subscription.category,
    icon_slug: subscription.iconSlug,
    color: subscription.color,
    notes: subscription.notes,
    is_active: subscription.isActive,
    is_trial: subscription.isTrial,
    is_archived: subscription.isArchived,
    cancel_reminder_days: subscription.cancelReminderDays ?? null
  };
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function fromApiSettings(settings: ApiUserSettings): UserSettings {
  return {
    notifyThreeDays: settings.notify_three_days,
    notifyOneDay: settings.notify_one_day,
    notifySameDay: settings.notify_same_day,
    notificationTime: settings.notification_time.slice(0, 5),
    primaryCurrency: settings.primary_currency,
    dateFormat: settings.date_format,
    theme: settings.theme
  };
}

export function toApiSettings(settings: Partial<UserSettings>) {
  return {
    notify_three_days: settings.notifyThreeDays,
    notify_one_day: settings.notifyOneDay,
    notify_same_day: settings.notifySameDay,
    notification_time: settings.notificationTime,
    primary_currency: settings.primaryCurrency,
    date_format: settings.dateFormat,
    theme: settings.theme
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; errors?: Record<string, string[]> };
    const firstError = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    return firstError ?? body.message ?? `API request failed: ${response.status}`;
  } catch {
    return `API request failed: ${response.status}`;
  }
}
