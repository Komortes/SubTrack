import { Stack } from "expo-router";
import { useNotificationRouting } from "@/hooks/useNotificationRouting";

export default function AppLayout() {
  useNotificationRouting();

  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0a0a0a" } }} />;
}
