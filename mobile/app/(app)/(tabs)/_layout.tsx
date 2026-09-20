import { Feather } from "@expo/vector-icons";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsDark } from "@/hooks/useIsDark";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
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
  label,
  color,
  onPress
}: {
  icon: FeatherIcon;
  focused: boolean;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const iconOpacity = useSharedValue(focused ? 1 : 0.7);

  useEffect(() => {
    iconOpacity.value = withTiming(focused ? 1 : 0.7, { duration: 180 });
  }, [focused, iconOpacity]);

  const iconStyle = useAnimatedStyle(() => ({ opacity: iconOpacity.value }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: focused }}
      style={{ flex: 1, alignItems: "center", paddingTop: 12, paddingBottom: 8, minHeight: 58 }}
    >
      <Animated.View style={iconStyle}>
        <Feather name={icon} size={21} color={color} />
      </Animated.View>
      <Text style={{ color, fontSize: 10, marginTop: 5, fontWeight: focused ? "700" : "500", opacity: focused ? 1 : 0.7 }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
  const ink = isDark ? "#fafafa" : "#0a0a0a";
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
      style={{ position: "absolute", bottom: Math.max(insets.bottom, 16), left: 16, right: 16, opacity: shouldHide ? 0 : 1 }}
    >
      <View
        style={{
          backgroundColor: isDark ? "#141414" : "#ffffff",
          borderColor: isDark ? "#303030" : "#dcdcdc",
          borderWidth: 1,
          borderRadius: 24,
          flexDirection: "row",
          paddingHorizontal: H_PAD,
          paddingBottom: 8,
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
              label={t(`navigation.${route.name === "index" ? "home" : route.name}`)}
              color={ink}
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
              backgroundColor: ink,
              shadowColor: ink,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
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
        lazy: true,
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
