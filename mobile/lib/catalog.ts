import { BillingPeriod, SubscriptionCategory } from "./types";

type ServiceSuggestion = {
  name: string;
  iconSlug: string;
  color: string;
  category: SubscriptionCategory;
  aliases?: string[];
  cancelUrl?: string;
};

export function getCancelInfo(iconSlug?: string): { cancelUrl: string } | null {
  if (!iconSlug) return null;
  const match = serviceSuggestions.find((s) => s.iconSlug === iconSlug && s.cancelUrl);
  return match?.cancelUrl ? { cancelUrl: match.cancelUrl } : null;
}

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

export const currencies = ["CZK", "EUR", "USD", "GBP", "CHF", "PLN", "HUF", "JPY", "CAD", "AUD", "SEK", "NOK", "DKK"] as const;

export const iconColors = ["#fafafa", "#ef4444", "#14b8a6", "#3b82f6", "#f59e0b", "#8b5cf6", "#22c55e"] as const;

export const serviceSuggestions: ServiceSuggestion[] = [
  { name: "Spotify", iconSlug: "spotify", color: "#1DB954", category: "entertainment", cancelUrl: "https://www.spotify.com/account/subscription/cancel" },
  { name: "Apple Music", iconSlug: "applemusic", color: "#FA243C", category: "entertainment", aliases: ["music", "музыка", "эпл музыка"], cancelUrl: "https://support.apple.com/billing" },
  { name: "YouTube Music", iconSlug: "youtubemusic", color: "#FF0000", category: "entertainment", aliases: ["yt music", "ютуб музыка"], cancelUrl: "https://myaccount.google.com/payments-and-subscriptions" },
  { name: "SoundCloud Go", iconSlug: "soundcloud", color: "#FF5500", category: "entertainment", cancelUrl: "https://soundcloud.com/settings/subscription" },
  { name: "Deezer", iconSlug: "deezer", color: "#A238FF", category: "entertainment", cancelUrl: "https://www.deezer.com/account/subscription" },
  { name: "Tidal", iconSlug: "tidal", color: "#000000", category: "entertainment", cancelUrl: "https://account.tidal.com/subscription" },
  { name: "Netflix", iconSlug: "netflix", color: "#E50914", category: "entertainment", cancelUrl: "https://www.netflix.com/cancelplan" },
  { name: "YouTube Premium", iconSlug: "youtube", color: "#DC2626", category: "entertainment", cancelUrl: "https://myaccount.google.com/payments-and-subscriptions" },
  { name: "Apple TV+", iconSlug: "appletv", color: "#000000", category: "entertainment", cancelUrl: "https://support.apple.com/billing" },
  { name: "Disney+", iconSlug: "disney", color: "#113CCF", category: "entertainment", cancelUrl: "https://www.disneyplus.com/account/subscription" },
  { name: "HBO Max", iconSlug: "hbomax", color: "#5822B4", category: "entertainment", aliases: ["max"], cancelUrl: "https://www.max.com/account/subscription" },
  { name: "Amazon Prime Video", iconSlug: "primevideo", color: "#00A8E1", category: "entertainment", aliases: ["prime video"], cancelUrl: "https://www.amazon.com/hz/subscriptions/manage" },
  { name: "Apple Arcade", iconSlug: "applearcade", color: "#111827", category: "entertainment", cancelUrl: "https://support.apple.com/billing" },
  { name: "PlayStation Plus", iconSlug: "playstation", color: "#006FCD", category: "entertainment", aliases: ["ps", "ps+", "ps plus", "пс", "пс+"], cancelUrl: "https://www.playstation.com/en-us/playstation-plus/cancel/" },
  { name: "Xbox Game Pass", iconSlug: "xbox", color: "#107C10", category: "entertainment", aliases: ["game pass"], cancelUrl: "https://account.microsoft.com/services/" },
  { name: "Nintendo Switch Online", iconSlug: "nintendo", color: "#E60012", category: "entertainment", aliases: ["switch online"], cancelUrl: "https://accounts.nintendo.com/profile/subscriptions" },
  { name: "EA Play", iconSlug: "eaplay", color: "#FF4747", category: "entertainment", cancelUrl: "https://myaccount.ea.com/cp-ui/subscriptions/index" },
  { name: "Steam", iconSlug: "steam", color: "#171A21", category: "entertainment" },
  { name: "Twitch", iconSlug: "twitch", color: "#9146FF", category: "entertainment", cancelUrl: "https://www.twitch.tv/subscriptions" },
  { name: "Patreon", iconSlug: "patreon", color: "#FF424D", category: "entertainment", cancelUrl: "https://www.patreon.com/pledges" },
  { name: "ChatGPT", iconSlug: "chatgpt", color: "#111827", category: "work", cancelUrl: "https://chat.openai.com/subscription" },
  { name: "OpenAI API", iconSlug: "openai", color: "#111827", category: "work", cancelUrl: "https://platform.openai.com/account/billing" },
  { name: "Claude", iconSlug: "claude", color: "#D97706", category: "work", cancelUrl: "https://claude.ai/settings" },
  { name: "Cursor", iconSlug: "cursor", color: "#111827", category: "work", cancelUrl: "https://www.cursor.com/settings" },
  { name: "Perplexity", iconSlug: "perplexity", color: "#1FB8CD", category: "work", cancelUrl: "https://www.perplexity.ai/settings/account" },
  { name: "Figma", iconSlug: "figma", color: "#A855F7", category: "work", cancelUrl: "https://www.figma.com/billing" },
  { name: "Canva Pro", iconSlug: "canva", color: "#00C4CC", category: "work", cancelUrl: "https://www.canva.com/settings/plan" },
  { name: "Adobe Creative Cloud", iconSlug: "adobe", color: "#DC2626", category: "work", cancelUrl: "https://account.adobe.com/plans" },
  { name: "JetBrains", iconSlug: "jetbrains", color: "#111827", category: "work", cancelUrl: "https://account.jetbrains.com/licenses" },
  { name: "Docker", iconSlug: "docker", color: "#2496ED", category: "work", cancelUrl: "https://app.docker.com/settings/billing" },
  { name: "Sentry", iconSlug: "sentry", color: "#362D59", category: "work", cancelUrl: "https://sentry.io/settings/billing/overview/" },
  { name: "Supabase", iconSlug: "supabase", color: "#3ECF8E", category: "work", cancelUrl: "https://supabase.com/dashboard/account/billing" },
  { name: "Railway", iconSlug: "railway", color: "#6B46FF", category: "work", cancelUrl: "https://railway.app/account/billing" },
  { name: "Render", iconSlug: "render", color: "#46E3B7", category: "work", cancelUrl: "https://dashboard.render.com/billing" },
  { name: "DigitalOcean", iconSlug: "digitalocean", color: "#0080FF", category: "work", cancelUrl: "https://cloud.digitalocean.com/account/billing" },
  { name: "AWS", iconSlug: "aws", color: "#FF9900", category: "work", aliases: ["amazon web services"], cancelUrl: "https://console.aws.amazon.com/billing/home" },
  { name: "Notion", iconSlug: "notion", color: "#111827", category: "work", cancelUrl: "https://www.notion.so/profile/plans" },
  { name: "Todoist", iconSlug: "todoist", color: "#E44332", category: "work", cancelUrl: "https://app.todoist.com/app/settings/subscription" },
  { name: "GitHub", iconSlug: "github", color: "#111827", category: "work", cancelUrl: "https://github.com/settings/billing/summary" },
  { name: "GitLab", iconSlug: "gitlab", color: "#FC6D26", category: "work", cancelUrl: "https://gitlab.com/billing" },
  { name: "Slack", iconSlug: "slack", color: "#4A154B", category: "work", cancelUrl: "https://slack.com/intl/billing" },
  { name: "Microsoft 365", iconSlug: "microsoft", color: "#00A4EF", category: "work", aliases: ["office", "office 365"], cancelUrl: "https://account.microsoft.com/services/" },
  { name: "Google Workspace", iconSlug: "google", color: "#4285F4", category: "work", aliases: ["workspace"], cancelUrl: "https://admin.google.com/ac/billing/subscriptions" },
  { name: "Linear", iconSlug: "linear", color: "#5E6AD2", category: "work", cancelUrl: "https://linear.app/settings/billing" },
  { name: "iCloud+", iconSlug: "icloud", color: "#2563EB", category: "cloud", cancelUrl: "https://support.apple.com/billing" },
  { name: "Dropbox", iconSlug: "dropbox", color: "#0061FF", category: "cloud", cancelUrl: "https://www.dropbox.com/account/plan" },
  { name: "Google One", iconSlug: "google", color: "#4285F4", category: "cloud", cancelUrl: "https://one.google.com/about/plans" },
  { name: "OneDrive", iconSlug: "onedrive", color: "#0078D4", category: "cloud", cancelUrl: "https://account.microsoft.com/services/" },
  { name: "Vercel", iconSlug: "vercel", color: "#111827", category: "cloud", cancelUrl: "https://vercel.com/dashboard/billing" },
  { name: "Cloudflare", iconSlug: "cloudflare", color: "#F97316", category: "cloud", cancelUrl: "https://dash.cloudflare.com/?to=/:account/billing" },
  { name: "iCloud Storage", iconSlug: "icloud", color: "#2563EB", category: "cloud", cancelUrl: "https://support.apple.com/billing" },
  { name: "Strava", iconSlug: "strava", color: "#FC4C02", category: "health", cancelUrl: "https://www.strava.com/account" },
  { name: "Headspace", iconSlug: "headspace", color: "#F47D31", category: "health", cancelUrl: "https://www.headspace.com/account" },
  { name: "Calm", iconSlug: "calm", color: "#0B5FFF", category: "health", cancelUrl: "https://www.calm.com/app/profile/subscriptions" },
  { name: "MyFitnessPal", iconSlug: "myfitnesspal", color: "#0066EE", category: "health", cancelUrl: "https://www.myfitnesspal.com/account/manage_premium" },
  { name: "Fitbod", iconSlug: "fitbod", color: "#111827", category: "health", cancelUrl: "https://support.apple.com/billing" },
  { name: "Coursera Plus", iconSlug: "coursera", color: "#0056D2", category: "other", aliases: ["coursera"], cancelUrl: "https://www.coursera.org/account-profile" },
  { name: "Udemy", iconSlug: "udemy", color: "#A435F0", category: "other", cancelUrl: "https://www.udemy.com/subscription/cancel/" },
  { name: "Brilliant", iconSlug: "brilliant", color: "#F5A623", category: "other", cancelUrl: "https://brilliant.org/profile/subscription/" },
  { name: "Skillshare", iconSlug: "skillshare", color: "#00FF84", category: "other", cancelUrl: "https://www.skillshare.com/account/subscription" },
  { name: "Grammarly", iconSlug: "grammarly", color: "#15C39A", category: "work", cancelUrl: "https://account.grammarly.com/subscription" },
  { name: "Medium", iconSlug: "medium", color: "#111827", category: "other", cancelUrl: "https://medium.com/me/membership/cancel" },
  { name: "Readwise", iconSlug: "readwise", color: "#111827", category: "other", cancelUrl: "https://readwise.io/accounts/manage" },
  { name: "Amazon Prime", iconSlug: "amazon", color: "#FF9900", category: "entertainment", cancelUrl: "https://www.amazon.com/hz/subscriptions/manage" },
  { name: "Wolt+", iconSlug: "wolt", color: "#00C2E8", category: "other", aliases: ["wolt plus"], cancelUrl: "https://wolt.com/me/subscriptions" },
  { name: "Bolt Plus", iconSlug: "bolt", color: "#34D186", category: "other", aliases: ["bolt+"] },
  { name: "Uber One", iconSlug: "uber", color: "#111827", category: "other", cancelUrl: "https://www.uber.com/go/help/24031050" },
  { name: "AlzaPlus+", iconSlug: "alza", color: "#7AC143", category: "other", aliases: ["alza", "alza plus"], cancelUrl: "https://www.alza.cz/alzaplus" },
  { name: "Mall Premium", iconSlug: "mall", color: "#E30613", category: "other" },
  { name: "Rohlík Premium", iconSlug: "rohlik", color: "#F6C343", category: "other", aliases: ["rohlik"] },
  { name: "Revolut Premium", iconSlug: "revolut", color: "#111827", category: "other", cancelUrl: "https://app.revolut.com/profile/membership" },
  { name: "Curve", iconSlug: "curve", color: "#111827", category: "other" },
  { name: "Telegram Premium", iconSlug: "telegram", color: "#2CA5E0", category: "other", cancelUrl: "https://t.me/PremiumBot" },
  { name: "Twitter / X Premium", iconSlug: "twitter", color: "#000000", category: "other", cancelUrl: "https://twitter.com/settings/premium_subscriptions" },
  { name: "Discord Nitro", iconSlug: "discord", color: "#5865F2", category: "other", aliases: ["nitro"], cancelUrl: "https://discord.com/settings/subscriptions" },
  { name: "LinkedIn Premium", iconSlug: "linkedin", color: "#0A66C2", category: "other", cancelUrl: "https://www.linkedin.com/premium/settings/" },
  { name: "Duolingo Super", iconSlug: "duolingo", color: "#58CC02", category: "other", aliases: ["super duolingo"], cancelUrl: "https://www.duolingo.com/settings/super" },
  { name: "1Password", iconSlug: "onepassword", color: "#0A84FF", category: "other", cancelUrl: "https://my.1password.com/billing" },
  { name: "NordVPN", iconSlug: "nordvpn", color: "#4687FF", category: "other", aliases: ["vpn"], cancelUrl: "https://my.nordaccount.com/subscription/" },
  { name: "Proton VPN", iconSlug: "protonvpn", color: "#6D4AFF", category: "other", cancelUrl: "https://account.proton.me/dashboard" },
  { name: "Surfshark", iconSlug: "surfshark", color: "#00BFA5", category: "other", cancelUrl: "https://my.surfshark.com/subscription" },
  { name: "Setapp", iconSlug: "setapp", color: "#00A86B", category: "other", cancelUrl: "https://my.setapp.com/manage-subscription" },
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
