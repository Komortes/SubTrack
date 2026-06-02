import { useColorScheme } from "react-native";
import { useSettingsStore } from "@/store/settingsStore";

export function useIsDark(): boolean {
  const theme = useSettingsStore((state) => state.theme);
  const systemScheme = useColorScheme();
  return theme === "dark" ? true : theme === "light" ? false : systemScheme !== "light";
}
