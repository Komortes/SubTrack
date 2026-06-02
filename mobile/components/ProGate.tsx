import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useProStatus } from "@/hooks/useProStatus";

type ProGateProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function ProGate({ children, fallback }: ProGateProps) {
  const isPro = useProStatus();
  if (isPro) return <>{children}</>;
  return <>{fallback ?? null}</>;
}

export function ProUpgradeBanner() {
  const { t } = useTranslation();
  return (
    <View className="mx-5 rounded-2xl border border-border bg-surface p-4">
      <Text className="font-semibold text-ink">{t("proGate.limitReached")}</Text>
      <Text className="mt-1 text-sm text-muted">{t("proGate.limitHint")}</Text>
      <Pressable
        onPress={() => router.push("/(app)/paywall")}
        className="mt-3 rounded-xl bg-ink px-4 py-3"
      >
        <Text className="text-center font-semibold text-bg">{t("proGate.upgradeButton")}</Text>
      </Pressable>
    </View>
  );
}
