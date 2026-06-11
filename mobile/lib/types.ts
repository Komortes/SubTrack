export type BillingPeriod = "weekly" | "monthly" | "yearly" | "custom";

export type SubscriptionCategory = "entertainment" | "work" | "cloud" | "health" | "other";

export type Subscription = {
  id: string;
  name: string;
  amount: number;
  currency: "CZK" | "EUR" | "USD" | "GBP" | "CHF" | "PLN" | "HUF" | "JPY" | "CAD" | "AUD" | "SEK" | "NOK" | "DKK";
  billingPeriod: BillingPeriod;
  customPeriodDays?: number;
  renewalDate: string;
  category: SubscriptionCategory;
  iconSlug?: string;
  color: string;
  notes?: string;
  isActive: boolean;
  isTrial: boolean;
  isArchived: boolean;
  cancelReminderDays?: number | null;
  createdAt: string;
  paymentHistory?: PaymentRecord[];
};

export type PaymentRecord = {
  id: string;
  subscriptionId: string;
  paidAt: string;
  amount: number;
  currency: Subscription["currency"];
};
