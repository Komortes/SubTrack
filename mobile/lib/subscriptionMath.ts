import { Subscription } from "./types";
import { toLocalDate, toLocalIsoDate } from "./dateFormat";

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
      const days = Math.max(1, subscription.customPeriodDays ?? 30);
      return subscription.amount * (30 / days);
    }
    case "monthly":
    default:
      return subscription.amount;
  }
}

const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatMoney(amount: number, currency = "CZK"): string {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("cs-CZ", { style: "currency", currency, minimumFractionDigits: 0 });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function daysUntil(date: string, today = new Date()): number {
  const target = toLocalDate(date);
  const targetDay = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const currentDay = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((targetDay - currentDay) / 86_400_000);
}

export function monthProgress(): number {
  const today = new Date();
  const total = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() / total;
}

export function nextRenewalDate(subscription: Pick<Subscription, "billingPeriod" | "customPeriodDays" | "renewalDate">): string {
  const value = toLocalDate(subscription.renewalDate);

  switch (subscription.billingPeriod) {
    case "weekly":
      value.setDate(value.getDate() + 7);
      break;
    case "yearly":
      addMonthsClamped(value, 12);
      break;
    case "custom":
      value.setDate(value.getDate() + Math.max(1, subscription.customPeriodDays ?? 30));
      break;
    case "monthly":
    default:
      addMonthsClamped(value, 1);
      break;
  }

  return toLocalIsoDate(value);
}

function addMonthsClamped(value: Date, months: number): void {
  const day = value.getDate();
  value.setDate(1);
  value.setMonth(value.getMonth() + months);
  const lastDay = new Date(value.getFullYear(), value.getMonth() + 1, 0).getDate();
  value.setDate(Math.min(day, lastDay));
}
