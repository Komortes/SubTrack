import { Text, View } from "react-native";

const BRAND_COLORS: Record<string, string> = {
  spotify: "#1db954",
  netflix: "#e50914",
  youtube: "#ff0000",
  github: "#24292e",
  apple: "#555555",
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
  cloudflare: "#f97316"
};

const SERVICE_LABELS: Record<string, string> = {
  spotify: "S",
  netflix: "N",
  apple: "A",
  google: "G",
  youtube: "Y",
  discord: "D",
  github: "GH",
  notion: "N",
  figma: "F",
  adobe: "A",
  chatgpt: "AI",
  claude: "C",
  dropbox: "D",
  icloud: "iC"
};

type Props = {
  name: string;
  iconSlug?: string;
  color?: string;
  size?: number;
};

export function ServiceIcon({ name, iconSlug, color, size = 44 }: Props) {
  const key = (iconSlug ?? name).toLowerCase().replace(/\s+/g, "");
  const label = iconSlug ? SERVICE_LABELS[iconSlug] : name.slice(0, 1).toUpperCase();
  const backgroundColor = BRAND_COLORS[key] ?? color ?? "#262626";
  const needsBorder = ["github", "notion", "vercel"].includes(key);

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
      <Text className="text-sm font-bold text-white">{label}</Text>
    </View>
  );
}
