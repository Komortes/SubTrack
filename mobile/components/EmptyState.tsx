import { Feather } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { AnimatedPressable } from "./AnimatedPressable";

type Props = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <View className="items-center rounded-3xl border border-border bg-surface px-8 py-12">
      <View className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-border">
        <Feather name={icon} size={32} color="#525252" />
      </View>
      <Text className="text-center text-lg font-bold text-ink">{title}</Text>
      <Text className="mt-2 text-center text-sm leading-5 text-muted">{subtitle}</Text>
      {action ? (
        <AnimatedPressable
          className="mt-6 rounded-2xl bg-accent px-6 py-3"
          onPress={action.onPress}
        >
          <Text className="font-semibold text-bg">{action.label}</Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
