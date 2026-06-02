import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useProStore } from "@/store/proStore";

const FEATURES: Array<{ icon: keyof typeof Feather.glyphMap; key: string }> = [
  { icon: "list", key: "paywall.features.unlimited" },
  { icon: "activity", key: "paywall.features.stats" },
  { icon: "download", key: "paywall.features.export" },
  { icon: "cloud", key: "paywall.features.backup" },
  { icon: "grid", key: "paywall.features.widget" },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { offering, isLoading, purchase, restore } = useProStore();
  const [selected, setSelected] = useState<"monthly" | "annual">("annual");
  const [purchasing, setPurchasing] = useState(false);

  const monthlyPkg = offering?.availablePackages.find((p) => p.identifier === "$rc_monthly");
  const annualPkg = offering?.availablePackages.find((p) => p.identifier === "$rc_annual");
  const activePkg = selected === "monthly" ? monthlyPkg : annualPkg;

  async function handlePurchase() {
    if (!activePkg) return;
    setPurchasing(true);
    try {
      await purchase(activePkg.identifier);
      router.back();
    } catch {
      // error already set in store
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    try {
      await restore();
      Alert.alert(t("paywall.restoreSuccess"));
      router.back();
    } catch (e: unknown) {
      Alert.alert((e as Error).message);
    }
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-12 pt-14 px-6">
      {/* Close button */}
      <Pressable onPress={() => router.back()} className="absolute right-5 top-14 z-10 p-2">
        <Feather name="x" size={22} color="#a3a3a3" />
      </Pressable>

      {/* Header */}
      <View className="items-center mt-6">
        <Text className="text-4xl font-bold tracking-tight text-ink">{t("paywall.title")}</Text>
        <Text className="mt-2 text-base text-muted">{t("paywall.subtitle")}</Text>
        <View className="mt-3 rounded-full bg-accent/10 px-4 py-1.5">
          <Text className="text-sm font-semibold text-accent">{t("paywall.trial")}</Text>
        </View>
      </View>

      {/* Feature list */}
      <View className="mt-8 gap-3 rounded-3xl border border-border bg-surface p-6">
        {FEATURES.map(({ icon, key }) => (
          <View key={key} className="flex-row items-center gap-3">
            <View className="h-8 w-8 items-center justify-center rounded-xl bg-bg">
              <Feather name={icon} size={15} color="#a3a3a3" />
            </View>
            <Text className="text-base font-medium text-ink">{t(key)}</Text>
          </View>
        ))}
      </View>

      {/* Plan toggle */}
      {isLoading ? (
        <View className="mt-8 items-center">
          <ActivityIndicator color="#fafafa" />
          <Text className="mt-2 text-sm text-muted">{t("paywall.loading")}</Text>
        </View>
      ) : (
        <View className="mt-6 flex-row gap-3">
          {/* Monthly */}
          <Pressable
            onPress={() => setSelected("monthly")}
            className={`flex-1 rounded-2xl border p-4 ${selected === "monthly" ? "border-ink bg-surface" : "border-border bg-surface/50"}`}
          >
            <Text className="text-sm font-semibold text-muted">{t("paywall.monthly")}</Text>
            <Text className="mt-1 text-xl font-bold text-ink">
              {monthlyPkg?.product.priceString ?? "–"}
            </Text>
          </Pressable>

          {/* Annual */}
          <Pressable
            onPress={() => setSelected("annual")}
            className={`flex-1 rounded-2xl border p-4 ${selected === "annual" ? "border-ink bg-surface" : "border-border bg-surface/50"}`}
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-muted">{t("paywall.annual")}</Text>
              <View className="rounded-full bg-green-500/15 px-2 py-0.5">
                <Text className="text-xs font-bold text-green-400">{t("paywall.annualBadge")}</Text>
              </View>
            </View>
            <Text className="mt-1 text-xl font-bold text-ink">
              {annualPkg?.product.priceString ?? "–"}
            </Text>
          </Pressable>
        </View>
      )}

      {/* CTA */}
      <Pressable
        onPress={handlePurchase}
        disabled={purchasing || isLoading || !activePkg}
        className="mt-5 rounded-2xl bg-ink px-5 py-4"
      >
        {purchasing ? (
          <ActivityIndicator color="#0a0a0a" />
        ) : (
          <Text className="text-center font-semibold text-bg">{t("paywall.startTrial")}</Text>
        )}
      </Pressable>

      <Text className="mt-3 text-center text-xs text-muted">{t("paywall.cancelAnytime")}</Text>

      {/* Footer */}
      <View className="mt-6 flex-row justify-center gap-5">
        <Pressable onPress={handleRestore}>
          <Text className="text-sm text-subtle">{t("paywall.restore")}</Text>
        </Pressable>
        <Text className="text-sm text-border">·</Text>
        <Pressable onPress={() => Linking.openURL("https://komortes.github.io/subtrack-privacy")}>
          <Text className="text-sm text-subtle">{t("paywall.privacy")}</Text>
        </Pressable>
        <Text className="text-sm text-border">·</Text>
        <Text className="text-sm text-subtle">{t("paywall.terms")}</Text>
      </View>
    </ScrollView>
  );
}
