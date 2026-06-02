import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";
import { Stack } from "expo-router";
import { LockScreen } from "@/components/LockScreen";
import { useNotificationRouting } from "@/hooks/useNotificationRouting";
import { useCurrencyStore } from "@/store/currencyStore";
import { useProStore } from "@/store/proStore";
import { useSettingsStore } from "@/store/settingsStore";

export default function AppLayout() {
  useNotificationRouting();

  const [locked, setLocked] = useState(() => useSettingsStore.getState().biometricLockEnabled);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    useCurrencyStore.getState().fetchRates();
  }, []);

  useEffect(() => {
    useProStore.getState().initialize();
  }, []);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (nextState === "background") {
        backgroundedAt.current = Date.now();
      } else if (nextState === "active") {
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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="paywall"
          options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
        />
      </Stack>
      <LockScreen visible={locked} onUnlock={() => setLocked(false)} />
    </>
  );
}
