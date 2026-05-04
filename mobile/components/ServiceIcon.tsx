import { Text, View } from "react-native";

const serviceEmoji: Record<string, string> = {
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
  color: string;
  size?: number;
};

export function ServiceIcon({ name, iconSlug, color, size = 44 }: Props) {
  const label = iconSlug ? serviceEmoji[iconSlug] : name.slice(0, 1).toUpperCase();

  return (
    <View
      className="items-center justify-center rounded-2xl"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Text className="text-sm font-bold text-white">{label}</Text>
    </View>
  );
}

