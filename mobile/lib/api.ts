import * as SecureStore from "expo-secure-store";
import { Subscription } from "./types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";
const TOKEN_KEY = "subtrack_token";

type ApiUser = {
  id: number;
  email: string;
};

type AuthResponse = {
  token: string;
  user: ApiUser;
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
  created_at: string;
};

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
  const response = await fetch(`${API_URL}${path}`, {
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

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function fetchSubscriptions(): Promise<Subscription[]> {
  const subscriptions = await apiRequest<ApiSubscription[]>("/subscriptions");
  return subscriptions.map(fromApiSubscription);
}

export async function createSubscription(subscription: Omit<Subscription, "id" | "createdAt">): Promise<Subscription> {
  const created = await apiRequest<ApiSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(toApiSubscription(subscription))
  });

  return fromApiSubscription(created);
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
    createdAt: subscription.created_at
  };
}

function toApiSubscription(subscription: Omit<Subscription, "id" | "createdAt">) {
  return {
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
    is_active: subscription.isActive
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
