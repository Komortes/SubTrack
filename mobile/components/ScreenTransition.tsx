import { useFocusEffect } from "expo-router";
import { ReactNode, useCallback } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DURATION, EASING } from "@/utils/animations";

type Props = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

export function ScreenTransition({ children, className, style }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);
  const scale = useSharedValue(0.99);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }]
  }));

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      translateY.value = 14;
      scale.value = 0.985;
      opacity.value = withTiming(1, { duration: DURATION.screen, easing: EASING.out });
      translateY.value = withTiming(0, { duration: DURATION.screen, easing: EASING.out });
      scale.value = withTiming(1, { duration: DURATION.screen, easing: EASING.out });
    }, [opacity, scale, translateY])
  );

  return (
    <Animated.View className={className} style={[{ flex: 1, backgroundColor: "#0a0a0a" }, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
