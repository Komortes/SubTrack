import { useEffect } from "react";
import { Feather } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
};

export function RefreshIndicator({ visible }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 800, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [rotation, visible]);

  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={{ alignItems: "center", paddingVertical: 10 }}
    >
      <Animated.View style={spin}>
        <Feather name="refresh-cw" size={16} color="#525252" />
      </Animated.View>
    </Animated.View>
  );
}
