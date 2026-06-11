import { Feather } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";
import { clearLocalRenewalNotifications, syncLocalRenewalNotifications } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

type FeatherIcon = keyof typeof Feather.glyphMap;

const tabConfig: Record<string, { icon: FeatherIcon }> = {
  index:         { icon: "home" },
  subscriptions: { icon: "list" },
  stats:         { icon: "activity" },
  settings:      { icon: "settings" }
};

const SPRING = { damping: 24, stiffness: 260, mass: 0.65 };
const H_PAD = 4;
const DOT_SIZE = 5;

function TabItem({
  icon,
  focused,
  onPress
}: {
  icon: FeatherIcon;
  focused: boolean;
  onPress: () => void;
}) {
  const iconOpacity = useSharedValue(focused ? 1 : 0.28);

  useEffect(() => {
    iconOpacity.value = withTiming(focused ? 1 : 0.28, { duration: 180 });
  }, [focused, iconOpacity]);

  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, alignItems: "center", paddingVertical: 14 }}
    >
      <Animated.View style={iconStyle}>
        <Feather name={icon} size={22} color="#fafafa" />
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - 32;
  const tabWidth = (barWidth - H_PAD * 2) / state.routes.length;
  const activeRoute = state.routes[state.index];
  const nestedRouteName = activeRoute ? getFocusedRouteNameFromRoute(activeRoute) : undefined;
  const shouldHide =
    activeRoute?.name === "subscriptions" &&
    nestedRouteName !== undefined &&
    nestedRouteName !== "index";

  // Dot slides to center of active tab
  const dotX = useSharedValue(H_PAD + state.index * tabWidth + tabWidth / 2 - DOT_SIZE / 2);

  useEffect(() => {
    dotX.value = withSpring(
      H_PAD + state.index * tabWidth + tabWidth / 2 - DOT_SIZE / 2,
      SPRING
    );
  }, [state.index, tabWidth, dotX]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dotX.value }]
  }));

  return (
    <View
      pointerEvents={shouldHide ? "none" : "box-none"}
      style={{ position: "absolute", bottom: 20, left: 16, right: 16, opacity: shouldHide ? 0 : 1 }}
    >
      <View
        style={{
          backgroundColor: "#141414",
          borderRadius: 32,
          flexDirection: "row",
          paddingHorizontal: H_PAD,
          paddingBottom: 12,
          position: "relative"
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = tabConfig[route.name] ?? { icon: "circle" as FeatherIcon };
          return (
            <TabItem
              key={route.key}
              icon={config.icon}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}

        {/* Sliding glow dot */}
        <Animated.View
          style={[
            dotStyle,
            {
              position: "absolute",
              bottom: 4,
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: "#fafafa",
              shadowColor: "#ffffff",
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.9,
              shadowRadius: 5,
              elevation: 6
            }
          ]}
        />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const notifyThreeDays = useSettingsStore((state) => state.notifyThreeDays);
  const notifyOneDay = useSettingsStore((state) => state.notifyOneDay);
  const notifySameDay = useSettingsStore((state) => state.notifySameDay);
  const notificationTime = useSettingsStore((state) => state.notificationTime);

  useEffect(() => {
    if (!isOfflineMode) {
      clearLocalRenewalNotifications().catch(() => undefined);
      return;
    }

    syncLocalRenewalNotifications(subscriptions, {
      notifyThreeDays,
      notifyOneDay,
      notifySameDay,
      notificationTime
    }).catch(() => undefined);
  }, [isOfflineMode, notificationTime, notifyOneDay, notifySameDay, notifyThreeDays, subscriptions]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneStyle: { backgroundColor: "transparent" }
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="subscriptions" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
