import { Feather } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { Pressable, useWindowDimensions, View, Text } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";

type FeatherIcon = keyof typeof Feather.glyphMap;

const tabConfig: Record<string, { icon: FeatherIcon; label: string }> = {
  index:         { icon: "home",      label: "HOME" },
  subscriptions: { icon: "list",      label: "SUBS" },
  stats:         { icon: "activity",  label: "STATS" },
  settings:      { icon: "settings",  label: "SET" }
};

const SPRING = { damping: 24, stiffness: 260, mass: 0.65 };
const H_PAD = 4;
const DOT_SIZE = 5;

function TabItem({
  icon,
  label,
  focused,
  onPress
}: {
  icon: FeatherIcon;
  label: string;
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
      style={{ flex: 1, alignItems: "center", paddingVertical: 10 }}
    >
      <Animated.View style={iconStyle}>
        <Feather name={icon} size={20} color="#fafafa" />
        <Text
          style={{
            color: "#fafafa",
            fontSize: 10,
            fontWeight: "600",
            marginTop: 4,
            letterSpacing: 0.4,
            textAlign: "center"
          }}
        >
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const barWidth = screenWidth - 32;
  const tabWidth = (barWidth - H_PAD * 2) / state.routes.length;

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
      pointerEvents="box-none"
      style={{ position: "absolute", bottom: 20, left: 16, right: 16 }}
    >
      <View
        style={{
          backgroundColor: "#141414",
          borderRadius: 32,
          flexDirection: "row",
          paddingHorizontal: H_PAD,
          position: "relative"
        }}
      >
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const config = tabConfig[route.name] ?? { icon: "circle" as FeatherIcon, label: route.name };
          return (
            <TabItem
              key={route.key}
              icon={config.icon}
              label={config.label}
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
              bottom: 6,
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
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false,
        sceneContainerStyle: { backgroundColor: "#0a0a0a" }
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="subscriptions" />
      <Tabs.Screen name="stats" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
