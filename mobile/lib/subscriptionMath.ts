import { Subscription } from "./types";

export function normalizeMonthlyAmount(subscription: Subscription): number {
  if (!subscription.isActive) {
    return 0;
  }

  switch (subscription.billingPeriod) {
    case "weekly":
      return subscription.amount * 4.345;
    case "yearly":
      return subscription.amount / 12;
    case "custom": {
      const days = subscription.customPeriodDays ?? 30;
      return subscription.amount * (30 / days);
    }
    case "monthly":
    default:
      return subscription.amount;
  }
}

export function formatMoney(amount: number, currency = "CZK"): string {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(amount);
}

export function daysUntil(date: string): number {
  const today = new Date();
  const target = new Date(`${date}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((target.getTime() - start.getTime()) / 86_400_000);
}

export function monthProgress(): number {
  const today = new Date();
  const total = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() / total;
}

