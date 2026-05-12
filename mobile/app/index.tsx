import { Redirect } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuthStore } from "@/store/authStore";

export default function IndexScreen() {
  const email = useAuthStore((state) => state.email);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const hasCheckedSession = useAuthStore((state) => state.hasCheckedSession);
  const hasCompletedOnboarding = useAuthStore((state) => state.hasCompletedOnboarding);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession().catch(() => undefined);
  }, [restoreSession]);

  if (!hasCheckedSession) {
    return (
      <View className="flex-1 items-center justify-center bg-bg">
        <ActivityIndicator color="#fafafa" />
      </View>
    );
  }

  if (email || (isOfflineMode && hasCompletedOnboarding)) {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}
