import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import { LockScreen } from "@/components/LockScreen";
import { PrivacyScreen } from "@/components/PrivacyScreen";
import { useNotificationRouting } from "@/hooks/useNotificationRouting";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useProStore } from "@/store/proStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function AppLayout() {
  useNotificationRouting();

  const [locked, setLocked] = useState(() => useSettingsStore.getState().biometricLockEnabled);
  const [isForeground, setIsForeground] = useState(true);
  const backgroundedAt = useRef<number | null>(null);
  const userId = useAuthStore((state) => state.userId);

  useEffect(() => {
    useCurrencyStore.getState().fetchRates();
  }, []);

  const isProInitialized = useRef(false);
  useEffect(() => {
    if (!isProInitialized.current) {
      isProInitialized.current = true;
      useProStore.getState().initialize(userId);
    } else {
      useProStore.getState().syncUser(userId);
    }
  }, [userId]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      // "inactive" (iOS: app switcher, incoming call, etc.) is a transitional
      // state too — treat anything that isn't "active" as backgrounded so the
      // privacy cover shows and the lock timer starts consistently.
      setIsForeground(nextState === "active");

      if (nextState !== "active") {
        if (backgroundedAt.current === null) {
          backgroundedAt.current = Date.now();
        }
      } else {
        const { biometricLockEnabled, biometricLockTimeout } = useSettingsStore.getState();
        if (biometricLockEnabled && backgroundedAt.current !== null) {
          const elapsed = (Date.now() - backgroundedAt.current) / 1000;
          if (elapsed >= biometricLockTimeout * 60) {
            setLocked(true);
          }
        }
        backgroundedAt.current = null;
      }
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
        />
        <Stack.Screen
          name="wrapped"
          options={{ presentation: "fullScreenModal", animation: "slide_from_bottom", headerShown: false }}
        />
      </Stack>
      <PrivacyScreen visible={!isForeground && !locked} />
      <LockScreen visible={locked} onUnlock={() => setLocked(false)} />
    </>
  );
}
