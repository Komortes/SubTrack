import { BillingPeriod, SubscriptionCategory } from "./types";

export const categories: Array<{ label: string; value: SubscriptionCategory }> = [
  { label: "Развлечения", value: "entertainment" },
  { label: "Работа", value: "work" },
  { label: "Облако", value: "cloud" },
  { label: "Здоровье", value: "health" },
  { label: "Другое", value: "other" }
];

export const billingPeriods: Array<{ label: string; value: BillingPeriod }> = [
  { label: "Еженедельно", value: "weekly" },
  { label: "Ежемесячно", value: "monthly" },
  { label: "Ежегодно", value: "yearly" },
  { label: "Кастом", value: "custom" }
];

export const currencies = ["CZK", "EUR", "USD"] as const;

export const serviceSuggestions = [
  { name: "Spotify", iconSlug: "spotify", color: "#1DB954", category: "entertainment" },
  { name: "Netflix", iconSlug: "netflix", color: "#E50914", category: "entertainment" },
  { name: "YouTube Premium", iconSlug: "youtube", color: "#DC2626", category: "entertainment" },
  { name: "ChatGPT", iconSlug: "chatgpt", color: "#111827", category: "work" },
  { name: "Claude", iconSlug: "claude", color: "#D97706", category: "work" },
  { name: "Figma", iconSlug: "figma", color: "#A855F7", category: "work" },
  { name: "Adobe Creative Cloud", iconSlug: "adobe", color: "#DC2626", category: "work" },
  { name: "iCloud+", iconSlug: "icloud", color: "#2563EB", category: "cloud" },
  { name: "Dropbox", iconSlug: "dropbox", color: "#0061FF", category: "cloud" },
  { name: "GitHub", iconSlug: "github", color: "#111827", category: "work" },
  { name: "Notion", iconSlug: "notion", color: "#111827", category: "work" },
  { name: "Vercel", iconSlug: "vercel", color: "#111827", category: "cloud" },
  { name: "Cloudflare", iconSlug: "cloudflare", color: "#F97316", category: "cloud" }
] as const;

export const categoryLabels = Object.fromEntries(categories.map((item) => [item.value, item.label])) as Record<
  SubscriptionCategory,
  string
>;

export const periodLabels = Object.fromEntries(billingPeriods.map((item) => [item.value, item.label])) as Record<
  BillingPeriod,
  string
>;
