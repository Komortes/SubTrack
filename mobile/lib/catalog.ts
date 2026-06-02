import { BillingPeriod, SubscriptionCategory } from "./types";

type ServiceSuggestion = {
  name: string;
  iconSlug: string;
  color: string;
  category: SubscriptionCategory;
  aliases?: string[];
};

export const categories: Array<{ label: string; value: SubscriptionCategory }> = [
  { label: "Entertainment", value: "entertainment" },
  { label: "Work", value: "work" },
  { label: "Cloud", value: "cloud" },
  { label: "Health", value: "health" },
  { label: "Other", value: "other" }
];

export const billingPeriods: Array<{ label: string; value: BillingPeriod }> = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Yearly", value: "yearly" },
  { label: "Custom", value: "custom" }
];

export const currencies = ["CZK", "EUR", "USD"] as const;

export const iconColors = ["#fafafa", "#ef4444", "#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"] as const;

export const serviceSuggestions: ServiceSuggestion[] = [
  { name: "Spotify", iconSlug: "spotify", color: "#1DB954", category: "entertainment" },
  { name: "Apple Music", iconSlug: "applemusic", color: "#FA243C", category: "entertainment", aliases: ["music", "музыка", "эпл музыка"] },
  { name: "YouTube Music", iconSlug: "youtubemusic", color: "#FF0000", category: "entertainment", aliases: ["yt music", "ютуб музыка"] },
  { name: "SoundCloud Go", iconSlug: "soundcloud", color: "#FF5500", category: "entertainment" },
  { name: "Deezer", iconSlug: "deezer", color: "#A238FF", category: "entertainment" },
  { name: "Tidal", iconSlug: "tidal", color: "#000000", category: "entertainment" },
  { name: "Netflix", iconSlug: "netflix", color: "#E50914", category: "entertainment" },
  { name: "YouTube Premium", iconSlug: "youtube", color: "#DC2626", category: "entertainment" },
  { name: "Apple TV+", iconSlug: "appletv", color: "#000000", category: "entertainment" },
  { name: "Disney+", iconSlug: "disney", color: "#113CCF", category: "entertainment" },
  { name: "HBO Max", iconSlug: "hbomax", color: "#5822B4", category: "entertainment", aliases: ["max"] },
  { name: "Amazon Prime Video", iconSlug: "primevideo", color: "#00A8E1", category: "entertainment", aliases: ["prime video"] },
  { name: "Apple Arcade", iconSlug: "applearcade", color: "#111827", category: "entertainment" },
  { name: "PlayStation Plus", iconSlug: "playstation", color: "#006FCD", category: "entertainment", aliases: ["ps", "ps+", "ps plus", "пс", "пс+"] },
  { name: "Xbox Game Pass", iconSlug: "xbox", color: "#107C10", category: "entertainment", aliases: ["game pass"] },
  { name: "Nintendo Switch Online", iconSlug: "nintendo", color: "#E60012", category: "entertainment", aliases: ["switch online"] },
  { name: "EA Play", iconSlug: "eaplay", color: "#FF4747", category: "entertainment" },
  { name: "Steam", iconSlug: "steam", color: "#171A21", category: "entertainment" },
  { name: "Twitch", iconSlug: "twitch", color: "#9146FF", category: "entertainment" },
  { name: "Patreon", iconSlug: "patreon", color: "#FF424D", category: "entertainment" },
  { name: "ChatGPT", iconSlug: "chatgpt", color: "#111827", category: "work" },
  { name: "OpenAI API", iconSlug: "openai", color: "#111827", category: "work" },
  { name: "Claude", iconSlug: "claude", color: "#D97706", category: "work" },
  { name: "Cursor", iconSlug: "cursor", color: "#111827", category: "work" },
  { name: "Perplexity", iconSlug: "perplexity", color: "#1FB8CD", category: "work" },
  { name: "Figma", iconSlug: "figma", color: "#A855F7", category: "work" },
  { name: "Canva Pro", iconSlug: "canva", color: "#00C4CC", category: "work" },
  { name: "Adobe Creative Cloud", iconSlug: "adobe", color: "#DC2626", category: "work" },
  { name: "JetBrains", iconSlug: "jetbrains", color: "#111827", category: "work" },
  { name: "Docker", iconSlug: "docker", color: "#2496ED", category: "work" },
  { name: "Sentry", iconSlug: "sentry", color: "#362D59", category: "work" },
  { name: "Supabase", iconSlug: "supabase", color: "#3ECF8E", category: "work" },
  { name: "Railway", iconSlug: "railway", color: "#6B46FF", category: "work" },
  { name: "Render", iconSlug: "render", color: "#46E3B7", category: "work" },
  { name: "DigitalOcean", iconSlug: "digitalocean", color: "#0080FF", category: "work" },
  { name: "AWS", iconSlug: "aws", color: "#FF9900", category: "work", aliases: ["amazon web services"] },
  { name: "Notion", iconSlug: "notion", color: "#111827", category: "work" },
  { name: "Todoist", iconSlug: "todoist", color: "#E44332", category: "work" },
  { name: "GitHub", iconSlug: "github", color: "#111827", category: "work" },
  { name: "GitLab", iconSlug: "gitlab", color: "#FC6D26", category: "work" },
  { name: "Slack", iconSlug: "slack", color: "#4A154B", category: "work" },
  { name: "Microsoft 365", iconSlug: "microsoft", color: "#00A4EF", category: "work", aliases: ["office", "office 365"] },
  { name: "Google Workspace", iconSlug: "google", color: "#4285F4", category: "work", aliases: ["workspace"] },
  { name: "Linear", iconSlug: "linear", color: "#5E6AD2", category: "work" },
  { name: "iCloud+", iconSlug: "icloud", color: "#2563EB", category: "cloud" },
  { name: "Dropbox", iconSlug: "dropbox", color: "#0061FF", category: "cloud" },
  { name: "Google One", iconSlug: "google", color: "#4285F4", category: "cloud" },
  { name: "OneDrive", iconSlug: "onedrive", color: "#0078D4", category: "cloud" },
  { name: "Vercel", iconSlug: "vercel", color: "#111827", category: "cloud" },
  { name: "Cloudflare", iconSlug: "cloudflare", color: "#F97316", category: "cloud" },
  { name: "iCloud Storage", iconSlug: "icloud", color: "#2563EB", category: "cloud" },
  { name: "Strava", iconSlug: "strava", color: "#FC4C02", category: "health" },
  { name: "Headspace", iconSlug: "headspace", color: "#F47D31", category: "health" },
  { name: "Calm", iconSlug: "calm", color: "#0B5FFF", category: "health" },
  { name: "MyFitnessPal", iconSlug: "myfitnesspal", color: "#0066EE", category: "health" },
  { name: "Fitbod", iconSlug: "fitbod", color: "#111827", category: "health" },
  { name: "Coursera Plus", iconSlug: "coursera", color: "#0056D2", category: "other", aliases: ["coursera"] },
  { name: "Udemy", iconSlug: "udemy", color: "#A435F0", category: "other" },
  { name: "Brilliant", iconSlug: "brilliant", color: "#F5A623", category: "other" },
  { name: "Skillshare", iconSlug: "skillshare", color: "#00FF84", category: "other" },
  { name: "Grammarly", iconSlug: "grammarly", color: "#15C39A", category: "work" },
  { name: "Medium", iconSlug: "medium", color: "#111827", category: "other" },
  { name: "Readwise", iconSlug: "readwise", color: "#111827", category: "other" },
  { name: "Amazon Prime", iconSlug: "amazon", color: "#FF9900", category: "entertainment" },
  { name: "Wolt+", iconSlug: "wolt", color: "#00C2E8", category: "other", aliases: ["wolt plus"] },
  { name: "Bolt Plus", iconSlug: "bolt", color: "#34D186", category: "other", aliases: ["bolt+"] },
  { name: "Uber One", iconSlug: "uber", color: "#111827", category: "other" },
  { name: "AlzaPlus+", iconSlug: "alza", color: "#7AC143", category: "other", aliases: ["alza", "alza plus"] },
  { name: "Mall Premium", iconSlug: "mall", color: "#E30613", category: "other" },
  { name: "Rohlík Premium", iconSlug: "rohlik", color: "#F6C343", category: "other", aliases: ["rohlik"] },
  { name: "Revolut Premium", iconSlug: "revolut", color: "#111827", category: "other" },
  { name: "Curve", iconSlug: "curve", color: "#111827", category: "other" },
  { name: "Telegram Premium", iconSlug: "telegram", color: "#2CA5E0", category: "other" },
  { name: "Twitter / X Premium", iconSlug: "twitter", color: "#000000", category: "other" },
  { name: "Discord Nitro", iconSlug: "discord", color: "#5865F2", category: "other", aliases: ["nitro"] },
  { name: "LinkedIn Premium", iconSlug: "linkedin", color: "#0A66C2", category: "other" },
  { name: "Duolingo Super", iconSlug: "duolingo", color: "#58CC02", category: "other", aliases: ["super duolingo"] },
  { name: "1Password", iconSlug: "onepassword", color: "#0A84FF", category: "other" },
  { name: "NordVPN", iconSlug: "nordvpn", color: "#4687FF", category: "other", aliases: ["vpn"] },
  { name: "Proton VPN", iconSlug: "protonvpn", color: "#6D4AFF", category: "other" },
  { name: "Surfshark", iconSlug: "surfshark", color: "#00BFA5", category: "other" },
  { name: "Setapp", iconSlug: "setapp", color: "#00A86B", category: "other" },
];

export const serviceIconOptions = [
  { label: "Spotify", slug: "spotify" },
  { label: "Apple Music", slug: "applemusic" },
  { label: "YT Music", slug: "youtubemusic" },
  { label: "SoundCloud", slug: "soundcloud" },
  { label: "Deezer", slug: "deezer" },
  { label: "Netflix", slug: "netflix" },
  { label: "YouTube", slug: "youtube" },
  { label: "Apple TV", slug: "appletv" },
  { label: "Disney+", slug: "disney" },
  { label: "HBO Max", slug: "hbomax" },
  { label: "Prime Video", slug: "primevideo" },
  { label: "Twitch", slug: "twitch" },
  { label: "PlayStation", slug: "playstation" },
  { label: "Xbox", slug: "xbox" },
  { label: "Nintendo", slug: "nintendo" },
  { label: "Steam", slug: "steam" },
  { label: "Amazon", slug: "amazon" },
  { label: "ChatGPT", slug: "chatgpt" },
  { label: "OpenAI", slug: "openai" },
  { label: "Claude", slug: "claude" },
  { label: "Cursor", slug: "cursor" },
  { label: "Figma", slug: "figma" },
  { label: "Canva", slug: "canva" },
  { label: "Adobe", slug: "adobe" },
  { label: "JetBrains", slug: "jetbrains" },
  { label: "Docker", slug: "docker" },
  { label: "Sentry", slug: "sentry" },
  { label: "Supabase", slug: "supabase" },
  { label: "AWS", slug: "aws" },
  { label: "Notion", slug: "notion" },
  { label: "GitHub", slug: "github" },
  { label: "GitLab", slug: "gitlab" },
  { label: "Slack", slug: "slack" },
  { label: "Microsoft", slug: "microsoft" },
  { label: "Linear", slug: "linear" },
  { label: "iCloud", slug: "icloud" },
  { label: "Dropbox", slug: "dropbox" },
  { label: "Google", slug: "google" },
  { label: "OneDrive", slug: "onedrive" },
  { label: "Vercel", slug: "vercel" },
  { label: "Cloudflare", slug: "cloudflare" },
  { label: "Telegram", slug: "telegram" },
  { label: "Twitter", slug: "twitter" },
  { label: "Discord", slug: "discord" },
  { label: "LinkedIn", slug: "linkedin" },
  { label: "Duolingo", slug: "duolingo" },
  { label: "1Password", slug: "onepassword" },
  { label: "NordVPN", slug: "nordvpn" },
  { label: "Proton VPN", slug: "protonvpn" },
  { label: "Wolt", slug: "wolt" },
  { label: "Bolt", slug: "bolt" },
  { label: "Uber", slug: "uber" },
  { label: "Revolut", slug: "revolut" },
  { label: "Coursera", slug: "coursera" },
  { label: "Udemy", slug: "udemy" },
  { label: "Letter", slug: "" }
] as const;

export const categoryLabels = Object.fromEntries(categories.map((item) => [item.value, item.label])) as Record<
  SubscriptionCategory,
  string
>;

export const periodLabels = Object.fromEntries(billingPeriods.map((item) => [item.value, item.label])) as Record<
  BillingPeriod,
  string
>;
