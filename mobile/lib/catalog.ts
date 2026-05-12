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

export const iconColors = ["#fafafa", "#ef4444", "#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"] as const;

export const serviceSuggestions = [
  { name: "Spotify", iconSlug: "spotify", color: "#1DB954", category: "entertainment" },
  { name: "Netflix", iconSlug: "netflix", color: "#E50914", category: "entertainment" },
  { name: "YouTube Premium", iconSlug: "youtube", color: "#DC2626", category: "entertainment" },
  { name: "Apple TV+", iconSlug: "appletv", color: "#000000", category: "entertainment" },
  { name: "Disney+", iconSlug: "disney", color: "#113CCF", category: "entertainment" },
  { name: "Twitch", iconSlug: "twitch", color: "#9146FF", category: "entertainment" },
  { name: "ChatGPT", iconSlug: "chatgpt", color: "#111827", category: "work" },
  { name: "Claude", iconSlug: "claude", color: "#D97706", category: "work" },
  { name: "Figma", iconSlug: "figma", color: "#A855F7", category: "work" },
  { name: "Adobe Creative Cloud", iconSlug: "adobe", color: "#DC2626", category: "work" },
  { name: "Notion", iconSlug: "notion", color: "#111827", category: "work" },
  { name: "GitHub", iconSlug: "github", color: "#111827", category: "work" },
  { name: "Slack", iconSlug: "slack", color: "#4A154B", category: "work" },
  { name: "Linear", iconSlug: "linear", color: "#5E6AD2", category: "work" },
  { name: "iCloud+", iconSlug: "icloud", color: "#2563EB", category: "cloud" },
  { name: "Dropbox", iconSlug: "dropbox", color: "#0061FF", category: "cloud" },
  { name: "Google One", iconSlug: "google", color: "#4285F4", category: "cloud" },
  { name: "Vercel", iconSlug: "vercel", color: "#111827", category: "cloud" },
  { name: "Cloudflare", iconSlug: "cloudflare", color: "#F97316", category: "cloud" },
  { name: "Amazon Prime", iconSlug: "amazon", color: "#FF9900", category: "entertainment" },
  { name: "Telegram Premium", iconSlug: "telegram", color: "#2CA5E0", category: "other" },
  { name: "Twitter / X Premium", iconSlug: "twitter", color: "#000000", category: "other" },
] as const;

export const serviceIconOptions = [
  { label: "Spotify", slug: "spotify" },
  { label: "Netflix", slug: "netflix" },
  { label: "YouTube", slug: "youtube" },
  { label: "Apple TV", slug: "appletv" },
  { label: "Disney+", slug: "disney" },
  { label: "Twitch", slug: "twitch" },
  { label: "Amazon", slug: "amazon" },
  { label: "ChatGPT", slug: "chatgpt" },
  { label: "Claude", slug: "claude" },
  { label: "Figma", slug: "figma" },
  { label: "Adobe", slug: "adobe" },
  { label: "Notion", slug: "notion" },
  { label: "GitHub", slug: "github" },
  { label: "Slack", slug: "slack" },
  { label: "Linear", slug: "linear" },
  { label: "iCloud", slug: "icloud" },
  { label: "Dropbox", slug: "dropbox" },
  { label: "Google", slug: "google" },
  { label: "Vercel", slug: "vercel" },
  { label: "Cloudflare", slug: "cloudflare" },
  { label: "Telegram", slug: "telegram" },
  { label: "Twitter", slug: "twitter" },
  { label: "Discord", slug: "discord" },
  { label: "Буква", slug: "" }
] as const;

export const categoryLabels = Object.fromEntries(categories.map((item) => [item.value, item.label])) as Record<
  SubscriptionCategory,
  string
>;

export const periodLabels = Object.fromEntries(billingPeriods.map((item) => [item.value, item.label])) as Record<
  BillingPeriod,
  string
>;
