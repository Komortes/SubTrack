import { useFocusEffect } from "expo-router";
import { ReactNode, useCallback, useRef } from "react";
import { StyleProp, ViewStyle } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { DURATION, EASING } from "@/utils/animations";

type Props = {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** When false, plays the entrance animation only on the first focus (good for tab screens). Default: true */
  replayOnFocus?: boolean;
};

export function ScreenTransition({ children, className, style, replayOnFocus = true }: Props) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(replayOnFocus ? 0 : 14);
  const scale = useSharedValue(replayOnFocus ? 1 : 0.985);
  const hasPlayed = useRef(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }]
  }));

  useFocusEffect(
    useCallback(() => {
      if (!replayOnFocus && hasPlayed.current) return;
      hasPlayed.current = true;

      opacity.value = 0;
      translateY.value = 14;
      scale.value = 0.985;
      opacity.value = withTiming(1, { duration: DURATION.screen, easing: EASING.out, reduceMotion: ReduceMotion.System });
      translateY.value = withTiming(0, { duration: DURATION.screen, easing: EASING.out, reduceMotion: ReduceMotion.System });
      scale.value = withTiming(1, { duration: DURATION.screen, easing: EASING.out, reduceMotion: ReduceMotion.System });
    }, [opacity, scale, translateY, replayOnFocus])
  );

  return (
    <Animated.View className={className} style={[{ flex: 1 }, animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
