import { useFocusEffect } from "expo-router";
import { ReactNode, useCallback } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming
} from "react-native-reanimated";
import { DURATION, EASING } from "@/utils/animations";

type Props = {
  children: ReactNode;
  className?: string;
  index?: number;
  replayOnFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FadeInView({ children, className, index = 0, replayOnFocus = false, style }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);
  const delay = Math.min(index, 4) * 50;

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }]
  }));

  const runAnimation = useCallback(() => {
    opacity.value = replayOnFocus ? 0 : opacity.value;
    translateY.value = replayOnFocus ? 8 : translateY.value;
    opacity.value = withDelay(delay, withTiming(1, { duration: DURATION.normal, easing: EASING.out, reduceMotion: ReduceMotion.System }));
    translateY.value = withDelay(delay, withTiming(0, { duration: DURATION.normal, easing: EASING.out, reduceMotion: ReduceMotion.System }));
  }, [delay, opacity, replayOnFocus, translateY]);

  useFocusEffect(
    useCallback(() => {
      runAnimation();
    }, [runAnimation])
  );

  return (
    <Animated.View className={className} style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

