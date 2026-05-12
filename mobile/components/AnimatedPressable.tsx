import { ReactNode } from "react";
import { Pressable, PressableProps, StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DURATION, EASING } from "@/utils/animations";

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = PressableProps & {
  children: ReactNode;
  className?: string;
  scaleTarget?: number;
  style?: StyleProp<ViewStyle>;
};

export function AnimatedPressable({
  children,
  className,
  scaleTarget = 0.97,
  style,
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
      {...rest}
      className={className}
      style={[animatedStyle, style]}
      onPressIn={(event) => {
        scale.value = withTiming(scaleTarget, { duration: DURATION.fast, easing: EASING.out });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.value = withTiming(1, { duration: DURATION.fast, easing: EASING.out });
        onPressOut?.(event);
      }}
    >
      {children}
    </ReanimatedPressable>
  );
}
