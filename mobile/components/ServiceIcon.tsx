import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

const BRAND_COLORS: Record<string, string> = {
  spotify: "#1db954",
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
  linear: "#5e6ad2"
};

// Only icons confirmed present in MaterialCommunityIcons glyph map
const MCI_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  spotify: "spotify",
  netflix: "netflix",
  youtube: "youtube",
  github: "github",
  dropbox: "dropbox",
  icloud: "apple-icloud",
  slack: "slack",
  microsoft: "microsoft",
  google: "google",
  apple: "apple",
  appletv: "apple",
  twitch: "twitch",
  twitter: "twitter",
  whatsapp: "whatsapp",
  instagram: "instagram",
  linkedin: "linkedin",
  facebook: "facebook"
};

const SERVICE_LABELS: Record<string, string> = {
  chatgpt: "AI",
  openai: "AI",
  claude: "Cl",
  notion: "N",
  figma: "F",
  adobe: "Ai",
  vercel: "▲",
  cloudflare: "CF",
  disney: "D+",
  linear: "Li"
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
  const mciIcon = iconSlug ? MCI_ICONS[iconSlug] : undefined;
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
      {mciIcon ? (
        <MaterialCommunityIcons name={mciIcon} size={iconSize} color="#ffffff" />
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
