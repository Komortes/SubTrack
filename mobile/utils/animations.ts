import { Easing } from "react-native-reanimated";

export const EASING = {
  out: Easing.bezier(0.23, 1, 0.32, 1),
  inOut: Easing.bezier(0.77, 0, 0.175, 1)
};

export const DURATION = {
  fast: 160,
  normal: 280,
  screen: 320
};

