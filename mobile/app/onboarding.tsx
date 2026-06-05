import { useState } from "react";
import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { ScrollView, Text, useColorScheme, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { HeroPhone } from "@/components/HeroPhone";
import { useAuthStore } from "@/store/authStore";

type FeatherIcon = keyof typeof Feather.glyphMap;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const enableOfflineMode = useAuthStore((state) => state.useOfflineMode);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#a3a3a3" : "#525252";

  const features: { icon: FeatherIcon; label: string }[] = [
    { icon: "bell",        label: t("onboarding.features.notifications") },
    { icon: "trending-up", label: t("onboarding.features.forecast") },
    { icon: "shield",      label: t("onboarding.features.privacy") }
  ];

  async function continueOffline() {
    setIsLoadingOffline(true);
    try {
      await enableOfflineMode();
      router.replace("/(app)/(tabs)");
    } finally {
      setIsLoadingOffline(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-10 pt-16" bounces={false} showsVerticalScrollIndicator={false}>

      {/* Header */}
      <FadeInView replayOnFocus={false} className="px-5">
        <Text
          className="text-subtle"
          style={{ fontSize: 10, fontWeight: "700", letterSpacing: 4, textTransform: "uppercase" }}
        >
          SubTrack
        </Text>
        <Text className="mt-3 text-5xl font-bold leading-[52px] tracking-tighter text-ink">
          {t("onboarding.headline")}
        </Text>
        <Text className="mt-4 text-base leading-7 text-subtle">
          {t("onboarding.subtitle")}
        </Text>
      </FadeInView>

      {/* 3D hero phone */}
      <FadeInView index={1} replayOnFocus={false} className="mt-8 items-center">
        <HeroPhone />
      </FadeInView>

      {/* Feature tiles */}
      <FadeInView index={2} replayOnFocus={false} className="mt-5 flex-row gap-2 px-5">
        {features.map((f) => (
          <View key={f.label} className="flex-1 rounded-xl border border-border bg-surface px-2.5 py-3">
            <Feather name={f.icon} size={16} color={iconColor} />
            <Text className="mt-1.5 text-[11px] font-semibold leading-[15px] text-subtle">{f.label}</Text>
          </View>
        ))}
      </FadeInView>

      {/* CTA buttons */}
      <FadeInView index={3} replayOnFocus={false} className="mt-6 gap-3 px-5">
        <Link href="/(auth)/register" asChild>
          <AnimatedPressable className="rounded-2xl bg-accent px-5 py-4">
            <Text className="text-center font-semibold text-bg">{t("onboarding.createAccount")}</Text>
          </AnimatedPressable>
        </Link>
        <AnimatedPressable
          className="rounded-2xl border border-border bg-surface px-5 py-4"
          onPress={continueOffline}
          disabled={isLoadingOffline}
        >
          <Text className="text-center font-semibold text-subtle">
            {isLoadingOffline ? "…" : t("onboarding.continueOffline")}
          </Text>
        </AnimatedPressable>
      </FadeInView>

    </ScrollView>
  );
}
