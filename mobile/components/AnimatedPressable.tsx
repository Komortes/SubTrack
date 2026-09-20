import { ReactNode } from "react";
import { cssInterop } from "nativewind";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { haptic } from "@/lib/haptics";
import { DURATION, EASING } from "@/utils/animations";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);
cssInterop(ReanimatedPressable, { className: "style" });

type Props = PressableProps & {
  children: ReactNode;
  className?: string;
  scaleTarget?: number;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
};

export function AnimatedPressable({
  children,
  className,
  scaleTarget = 0.97,
  style,
  hapticFeedback = true,
  onPressIn,
  onPressOut,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  return (
    <ReanimatedPressable
      accessibilityRole="button"
      {...rest}
      accessibilityState={{ ...rest.accessibilityState, disabled: !!rest.disabled }}
      className={className}
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        scale.value = withTiming(scaleTarget, { duration: DURATION.fast, easing: EASING.out, reduceMotion: ReduceMotion.System });
        if (hapticFeedback) haptic.light();
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: DURATION.fast, easing: EASING.out, reduceMotion: ReduceMotion.System });
        onPressOut?.(event);
      }}
    >
      {children}
    </ReanimatedPressable>
  );
}
