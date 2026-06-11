import { convertAmount, CurrencyRates } from "@/store/currencyStore";
import { normalizeMonthlyAmount } from "./subscriptionMath";
import { Subscription } from "./types";

export type WrappedStats = {
  year: number;
  totalSpent: number;
  topSubscription: { name: string; color: string; iconSlug?: string; total: number } | null;
  longestRunning: { name: string; color: string; iconSlug?: string; months: number } | null;
  categoryBreakdown: { category: string; total: number }[];
  trackedCount: number;
  currency: string;
};

export function computeWrappedStats(
  subscriptions: Subscription[],
  primaryCurrency: string,
  rates: CurrencyRates,
  year = new Date().getFullYear()
): WrappedStats {
  const startOf = `${year}-01-01`;
  const endOf = `${year}-12-31`;

  function toMonthlyPrimary(sub: Subscription): number {
    const monthly = normalizeMonthlyAmount(sub);
    return convertAmount(monthly, sub.currency, primaryCurrency, rates);
  }

  // Total from paymentHistory for the year
  let totalSpent = 0;
  const spentPerSub = new Map<string, number>();

  for (const sub of subscriptions) {
    let subTotal = 0;
    for (const record of sub.paymentHistory ?? []) {
      const date = record.paidAt.slice(0, 10);
      if (date >= startOf && date <= endOf) {
        subTotal += convertAmount(record.amount, record.currency, primaryCurrency, rates);
      }
    }
    // Fall back to estimated annual spend if no payment history recorded
    if (subTotal === 0 && sub.createdAt <= endOf && !sub.isArchived) {
      subTotal = toMonthlyPrimary(sub) * 12;
    }
    spentPerSub.set(sub.id, subTotal);
    totalSpent += subTotal;
  }

  // Top subscription by total spent this year
  let topSub: WrappedStats["topSubscription"] = null;
  let topAmount = 0;
  for (const sub of subscriptions) {
    const amount = spentPerSub.get(sub.id) ?? 0;
    if (amount > topAmount) {
      topAmount = amount;
      topSub = { name: sub.name, color: sub.color, iconSlug: sub.iconSlug, total: amount };
    }
  }

  // Longest running active subscription by createdAt
  let longestSub: WrappedStats["longestRunning"] = null;
  let longestMonths = 0;
  const now = new Date();
  for (const sub of subscriptions) {
    if (sub.isArchived) continue;
    const created = new Date(sub.createdAt);
    const months =
      (now.getFullYear() - created.getFullYear()) * 12 +
      (now.getMonth() - created.getMonth());
    if (months > longestMonths) {
      longestMonths = months;
      longestSub = { name: sub.name, color: sub.color, iconSlug: sub.iconSlug, months };
    }
  }

  // Category breakdown
  const byCategory = new Map<string, number>();
  for (const sub of subscriptions) {
    const amount = spentPerSub.get(sub.id) ?? 0;
    if (amount > 0) {
      byCategory.set(sub.category, (byCategory.get(sub.category) ?? 0) + amount);
    }
  }
  const categoryBreakdown = Array.from(byCategory.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);

  return {
    year,
    totalSpent: Math.round(totalSpent),
    topSubscription: topSub ? { ...topSub, total: Math.round(topSub.total) } : null,
    longestRunning: longestSub,
    categoryBreakdown: categoryBreakdown.map((c) => ({ ...c, total: Math.round(c.total) })),
    trackedCount: subscriptions.filter((s) => !s.isArchived).length,
    currency: primaryCurrency,
  };
}
