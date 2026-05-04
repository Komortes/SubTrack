import { Tabs } from "expo-router";
import { Text } from "react-native";

function TabIcon({ value }: { value: string }) {
  return <Text>{value}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#0F766E",
        tabBarInactiveTintColor: "#6B7280"
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: () => <TabIcon value="H" /> }} />
      <Tabs.Screen name="subscriptions" options={{ title: "Subs", tabBarIcon: () => <TabIcon value="S" /> }} />
      <Tabs.Screen name="stats" options={{ title: "Stats", tabBarIcon: () => <TabIcon value="A" /> }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", tabBarIcon: () => <TabIcon value="G" /> }} />
    </Tabs>
  );
}

