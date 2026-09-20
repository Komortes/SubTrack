import { useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, Modal, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

export function LockScreen({ visible, onUnlock }: { visible: boolean; onUnlock: () => void }) {
  const { t } = useTranslation();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const logout = useAuthStore((state) => state.logout);

  async function handleUnlock() {
    if (isAuthenticating) return;
    setIsAuthenticating(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t("lockScreen.title"),
        cancelLabel: t("common.cancel"),
        // Allow the device passcode as a fallback: if Face/Touch ID is
        // temporarily unavailable (injury, mask, hardware issue) with no
        // fallback, users were being permanently locked out of the app.
        disableDeviceFallback: false,
      });
      if (result.success) {
        onUnlock();
      }
    } catch {
      Alert.alert(t("common.error"), t("lockScreen.unlockError"));
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleLogout() {
    Alert.alert(t("lockScreen.logoutConfirmTitle"), t("lockScreen.logoutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("lockScreen.logoutButton"),
        style: "destructive",
        onPress: () => {
          logout()
            .then(() => {
              onUnlock();
              router.replace("/");
            })
            .catch(() => undefined);
        }
      }
    ]);
  }

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View className="flex-1 items-center justify-center bg-bg px-8">
        <View className="mb-8 h-20 w-20 items-center justify-center rounded-3xl border border-border bg-surface">
          <Feather name="lock" size={36} color="#a3a3a3" />
        </View>
        <Text className="mb-2 text-2xl font-bold text-ink">{t("lockScreen.title")}</Text>
        <Text className="mb-12 text-center text-sm text-muted">
          {t("lockScreen.subtitle")}
        </Text>
        <AnimatedPressable
          disabled={isAuthenticating}
          className={`w-full rounded-2xl bg-accent py-4${isAuthenticating ? " opacity-50" : ""}`}
          onPress={() => {
            handleUnlock().catch(() => undefined);
          }}
        >
          <Text className="text-center text-base font-semibold text-bg">
            {isAuthenticating ? "..." : t("lockScreen.unlockButton")}
          </Text>
        </AnimatedPressable>
        <AnimatedPressable className="mt-4 py-2" onPress={handleLogout}>
          <Text className="text-center text-sm font-medium text-muted">{t("lockScreen.logoutButton")}</Text>
        </AnimatedPressable>
      </View>
    </Modal>
  );
}
