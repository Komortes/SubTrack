import "@/lib/i18n";
import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { darkTheme, lightTheme } from "@/lib/theme";
import { useSettingsStore } from "@/store/settingsStore";

function ThemedRoot({ children }: { children: React.ReactNode }) {
  const setting = useSettingsStore((state) => state.theme);
  const systemScheme = useColorScheme();

  const isDark =
    setting === "dark" ? true
    : setting === "light" ? false
    : systemScheme !== "light";

  return (
    <GestureHandlerRootView style={[{ flex: 1 }, isDark ? darkTheme : lightTheme]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {children}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemedRoot>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemedRoot>
  );
}
