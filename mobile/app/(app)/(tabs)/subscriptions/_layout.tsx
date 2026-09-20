import { Stack } from "expo-router";
import { useIsDark } from "@/hooks/useIsDark";

export default function SubscriptionsLayout() {
  const isDark = useIsDark();
  const backgroundColor = isDark ? "#0a0a0a" : "#fafafa";
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor },
        headerTintColor: isDark ? "#fafafa" : "#0a0a0a",
        contentStyle: { backgroundColor }
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ presentation: "modal" }} />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
