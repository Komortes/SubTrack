import { FontAwesome5, FontAwesome6, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const BRAND_COLORS: Record<string, string> = {
  spotify: "#1db954",
  applemusic: "#fa243c",
  youtubemusic: "#ff0000",
  netflix: "#e50914",
  youtube: "#ff0000",
  github: "#24292e",
  apple: "#555555",
  appletv: "#000000",
  adobe: "#ff0000",
  dropbox: "#0061ff",
  notion: "#000000",
  slack: "#4a154b",
  figma: "#f24e1e",
  google: "#4285f4",
  amazon: "#ff9900",
  microsoft: "#00a4ef",
  onedrive: "#0078d4",
  discord: "#5865f2",
  chatgpt: "#10a37f",
  openai: "#10a37f",
  claude: "#d97706",
  icloud: "#3478f6",
  vercel: "#000000",
  cloudflare: "#f97316",
  twitch: "#9146ff",
  twitter: "#000000",
  telegram: "#2ca5e0",
  whatsapp: "#25d366",
  instagram: "#e1306c",
  linkedin: "#0a66c2",
  facebook: "#1877f2",
  disney: "#113ccf",
  hbomax: "#5822b4",
  primevideo: "#00a8e1",
  playstation: "#006fcd",
  xbox: "#107c10",
  nintendo: "#e60012",
  eaplay: "#ff4747",
  steam: "#171a21",
  patreon: "#ff424d",
  soundcloud: "#ff5500",
  deezer: "#a238ff",
  tidal: "#000000",
  linear: "#5e6ad2",
  cursor: "#111827",
  perplexity: "#1fb8cd",
  canva: "#00c4cc",
  todoist: "#e44332",
  gitlab: "#fc6d26",
  strava: "#fc4c02",
  headspace: "#f47d31",
  calm: "#0b5fff",
  myfitnesspal: "#0066ee",
  fitbod: "#111827",
  duolingo: "#58cc02",
  onepassword: "#0a84ff",
  nordvpn: "#4687ff",
  setapp: "#00a86b",
  jetbrains: "#111827",
  docker: "#2496ed",
  sentry: "#362d59",
  supabase: "#3ecf8e",
  railway: "#6b46ff",
  render: "#46e3b7",
  digitalocean: "#0080ff",
  aws: "#ff9900",
  coursera: "#0056d2",
  udemy: "#a435f0",
  brilliant: "#f5a623",
  skillshare: "#00ff84",
  grammarly: "#15c39a",
  medium: "#111827",
  readwise: "#111827",
  wolt: "#00c2e8",
  bolt: "#34d186",
  uber: "#111827",
  alza: "#7ac143",
  mall: "#e30613",
  rohlik: "#f6c343",
  revolut: "#111827",
  curve: "#111827",
  protonvpn: "#6d4aff",
  surfshark: "#00bfa5"
};

type IconConfig =
  | { pack: "mci"; name: keyof typeof MaterialCommunityIcons.glyphMap }
  | { pack: "fa5"; name: keyof typeof FontAwesome5.glyphMap }
  | { pack: "fa6"; name: keyof typeof FontAwesome6.glyphMap }
  | { pack: "ion"; name: keyof typeof Ionicons.glyphMap };

const BRAND_ICONS: Record<string, IconConfig> = {
  spotify: { pack: "fa5", name: "spotify" },
  netflix: { pack: "mci", name: "netflix" },
  youtube: { pack: "ion", name: "logo-youtube" },
  github: { pack: "ion", name: "logo-github" },
  dropbox: { pack: "mci", name: "dropbox" },
  icloud: { pack: "mci", name: "apple-icloud" },
  slack: { pack: "ion", name: "logo-slack" },
  microsoft: { pack: "ion", name: "logo-microsoft" },
  onedrive: { pack: "mci", name: "microsoft-onedrive" },
  google: { pack: "ion", name: "logo-google" },
  apple: { pack: "ion", name: "logo-apple" },
  appletv: { pack: "ion", name: "logo-apple" },
  applemusic: { pack: "mci", name: "music" },
  applearcade: { pack: "mci", name: "gamepad-variant" },
  youtubemusic: { pack: "ion", name: "logo-youtube" },
  twitch: { pack: "ion", name: "logo-twitch" },
  twitter: { pack: "fa6", name: "x-twitter" },
  whatsapp: { pack: "ion", name: "logo-whatsapp" },
  instagram: { pack: "ion", name: "logo-instagram" },
  linkedin: { pack: "ion", name: "logo-linkedin" },
  facebook: { pack: "ion", name: "logo-facebook" },
  playstation: { pack: "ion", name: "logo-playstation" },
  xbox: { pack: "ion", name: "logo-xbox" },
  nintendo: { pack: "mci", name: "nintendo-switch" },
  steam: { pack: "ion", name: "logo-steam" },
  soundcloud: { pack: "ion", name: "logo-soundcloud" },
  patreon: { pack: "fa5", name: "patreon" },
  gitlab: { pack: "ion", name: "logo-gitlab" },
  discord: { pack: "ion", name: "logo-discord" },
  strava: { pack: "fa5", name: "strava" },
  deezer: { pack: "fa5", name: "deezer" },
  amazon: { pack: "ion", name: "logo-amazon" },
  vpn: { pack: "mci", name: "vpn" },
  nordvpn: { pack: "mci", name: "vpn" },
  onepassword: { pack: "mci", name: "shield-lock" },
  duolingo: { pack: "mci", name: "school" },
  todoist: { pack: "mci", name: "checkbox-marked-circle-outline" },
  myfitnesspal: { pack: "mci", name: "food-apple" },
  headspace: { pack: "mci", name: "meditation" },
  calm: { pack: "mci", name: "meditation" },
  fitbod: { pack: "mci", name: "dumbbell" },
  setapp: { pack: "mci", name: "apps" },
  cursor: { pack: "mci", name: "cursor-default-click" },
  perplexity: { pack: "mci", name: "brain" },
  canva: { pack: "mci", name: "palette" },
  cloudflare: { pack: "mci", name: "cloud" },
  vercel: { pack: "mci", name: "triangle" },
  linear: { pack: "mci", name: "chart-timeline-variant" },
  docker: { pack: "ion", name: "logo-docker" },
  aws: { pack: "mci", name: "aws" },
  digitalocean: { pack: "mci", name: "digital-ocean" },
  medium: { pack: "ion", name: "logo-medium" },
  uber: { pack: "fa5", name: "uber" },
  sentry: { pack: "mci", name: "bug-check" },
  supabase: { pack: "mci", name: "elephant" },
  railway: { pack: "ion", name: "train" },
  render: { pack: "mci", name: "rocket-launch" },
  coursera: { pack: "ion", name: "school" },
  udemy: { pack: "mci", name: "school" },
  brilliant: { pack: "mci", name: "lightbulb-on" },
  skillshare: { pack: "mci", name: "pencil-ruler" },
  grammarly: { pack: "mci", name: "format-letter-case" },
  readwise: { pack: "mci", name: "book-open-variant" },
  wolt: { pack: "mci", name: "bike-fast" },
  bolt: { pack: "mci", name: "flash" },
  alza: { pack: "mci", name: "cart" },
  mall: { pack: "mci", name: "shopping" },
  rohlik: { pack: "mci", name: "cart-heart" },
  revolut: { pack: "mci", name: "bank" },
  curve: { pack: "mci", name: "credit-card" },
  protonvpn: { pack: "mci", name: "shield-lock" },
  surfshark: { pack: "mci", name: "shield-check" }
};

const SERVICE_LABELS: Record<string, string> = {
  chatgpt: "AI",
  openai: "AI",
  claude: "Cl",
  notion: "N",
  figma: "F",
  cursor: "Cu",
  perplexity: "P",
  canva: "C",
  adobe: "Ai",
  todoist: "To",
  vercel: "▲",
  cloudflare: "CF",
  disney: "D+",
  hbomax: "Max",
  primevideo: "Prime",
  eaplay: "EA",
  tidal: "T",
  linear: "Li",
  jetbrains: "JB"
};

type Props = {
  name: string;
  iconSlug?: string;
  color?: string;
  size?: number;
};

export function ServiceIcon({ name, iconSlug, color, size = 44 }: Props) {
  const key = (iconSlug ?? name).toLowerCase().replace(/\s+/g, "");
  const backgroundColor = BRAND_COLORS[key] ?? color ?? "#262626";
  const needsBorder = ["github", "notion", "vercel", "twitter", "appletv", "chatgpt", "openai"].includes(key);
  const brandIcon = iconSlug ? BRAND_ICONS[iconSlug] : undefined;
  const iconSize = Math.round(size * 0.52);

  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        backgroundColor,
        borderWidth: needsBorder ? 1 : 0,
        borderColor: "#333333"
      }}
    >
      {brandIcon ? (
        <IconRenderer icon={brandIcon} size={iconSize} />
      ) : (
        <Text
          style={{ fontSize: Math.max(10, Math.round(size * 0.3)), fontWeight: "700", color: "#ffffff" }}
        >
          {iconSlug
            ? (SERVICE_LABELS[iconSlug] ?? iconSlug.slice(0, 2).toUpperCase())
            : name.slice(0, 1).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

function IconRenderer({ icon, size }: { icon: IconConfig; size: number }) {
  if (icon.pack === "fa5") return <FontAwesome5 name={icon.name} size={size} color="#ffffff" />;
  if (icon.pack === "fa6") return <FontAwesome6 name={icon.name} size={size} color="#ffffff" />;
  if (icon.pack === "ion") return <Ionicons name={icon.name} size={size} color="#ffffff" />;
  return <MaterialCommunityIcons name={icon.name} size={size} color="#ffffff" />;
}
