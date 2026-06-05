import { Feather } from "@expo/vector-icons";
import type { ReactNode, Ref } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";
import { useTranslation } from "react-i18next";

type FeatherIcon = keyof typeof Feather.glyphMap;

export function AuthHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View>
      <Text
        className="text-subtle"
        style={{ fontSize: 10, fontWeight: "700", letterSpacing: 4, textTransform: "uppercase" }}
      >
        {eyebrow}
      </Text>
      <Text className="mt-3 text-4xl font-bold leading-tight tracking-tighter text-ink">{title}</Text>
      <Text className="mt-3 text-base leading-6 text-subtle">{subtitle}</Text>
    </View>
  );
}

export function AuthValueStrip() {
  const { t } = useTranslation();
  const items: { icon: FeatherIcon; label: string }[] = [
    { icon: "refresh-cw", label: t("common.syncing") },
    { icon: "bell",       label: t("settings.sections.notifications") },
    { icon: "lock",       label: t("settings.rows.offlineMode") },
  ];
  return (
    <View className="mt-7 flex-row gap-2">
      {items.map((item) => (
        <View key={item.label} className="flex-1 rounded-xl border border-border bg-surface px-2.5 py-3">
          <Feather name={item.icon} size={16} color="#a3a3a3" />
          <Text className="mt-1.5 text-[11px] font-semibold leading-[15px] text-subtle">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function AuthField({
  icon,
  label,
  right,
  invalid,
  inputRef,
  ...props
}: TextInputProps & {
  icon: FeatherIcon;
  label: string;
  right?: ReactNode;
  invalid?: boolean;
  inputRef?: Ref<TextInput>;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-semibold text-subtle">{label}</Text>
      <View className={`flex-row items-center rounded-2xl border bg-surface px-4 ${invalid ? "border-danger" : "border-border"}`}>
        <Feather name={icon} size={17} color={invalid ? "#ef4444" : "#a3a3a3"} />
        <TextInput
          ref={inputRef}
          className="flex-1 px-3 py-4 text-base text-ink"
          placeholderTextColor="#525252"
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

export function AuthDivider() {
  const { t } = useTranslation();
  return (
    <View className="my-5 flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      <Text className="text-xs text-muted">{t("auth.social.orDivider")}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
