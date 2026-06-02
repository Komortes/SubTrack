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
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{eyebrow}</Text>
      <Text className="mt-3 text-4xl font-bold leading-tight tracking-tighter text-ink">{title}</Text>
      <Text className="mt-3 text-base leading-6 text-subtle">{subtitle}</Text>
    </View>
  );
}

export function AuthValueStrip() {
  const { t } = useTranslation();
  return (
    <View className="mt-7 flex-row gap-2">
      <AuthValue icon="refresh-cw" label={t("common.syncing")} />
      <AuthValue icon="bell" label={t("settings.sections.notifications")} />
      <AuthValue icon="lock" label={t("settings.rows.offlineMode")} />
    </View>
  );
}

function AuthValue({ icon, label }: { icon: FeatherIcon; label: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-surface p-3">
      <Feather name={icon} size={16} color="#a3a3a3" />
      <Text className="mt-2 text-xs font-semibold leading-4 text-muted">{label}</Text>
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
      <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{label}</Text>
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
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("auth.social.orDivider")}</Text>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
