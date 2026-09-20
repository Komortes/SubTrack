import type { MonthlyAnalyticsPoint } from "@/lib/api";
import { convertAmount, CurrencyRates } from "@/store/currencyStore";

export function convertMonthlyHistory(
  points: MonthlyAnalyticsPoint[],
  primaryCurrency: string,
  rates: CurrencyRates
): MonthlyAnalyticsPoint[] {
  const hasRate = (currency: string) => currency === "CZK"
    || (Number.isFinite(rates[currency as keyof CurrencyRates]) && rates[currency as keyof CurrencyRates] > 0);
  if (!hasRate(primaryCurrency)) return [];

  const converted: MonthlyAnalyticsPoint[] = [];
  for (const point of points) {
    // Legacy totals have no currency identity, including payments for deleted
    // subscriptions. Do not infer that identity from today's subscriptions.
    if (!point.totalsByCurrency) return [];
    let total = 0;
    for (const [currency, amount] of Object.entries(point.totalsByCurrency)) {
      if (!Number.isFinite(amount) || !hasRate(currency)) return [];
      total += convertAmount(amount, currency, primaryCurrency, rates);
    }
    if (!Number.isFinite(total)) return [];
    converted.push({ ...point, total: Math.round(total * 100) / 100 });
  }
  return converted;
}
