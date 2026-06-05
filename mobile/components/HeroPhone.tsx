import { useEffect } from "react";
import { AccessibilityInfo, useColorScheme, useWindowDimensions, View, Text } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";

const BG = "#0a0a0a";

const PHONE_W = 228;
const PHONE_H = 520;  // intentionally tall — bottom rounding stays below the crop
const CROP_H  = 320;

const CARD_H   = 52;
const CARD_GAP = 8;
const CYCLE    = 10 * (CARD_H + CARD_GAP);

// Inset of the card clip-view from the phone edges.
// Keeps cards away from the border-radius corner area so they never bleed.
const INSET = 7;
// Where cards start vertically (below island)
const CARDS_TOP = 46;

const SERVICES = [
  { letter: "N", name: "Netflix",  color: "#E50914", amount: "249 CZK", days: "in 3 days"   },
  { letter: "S", name: "Spotify",  color: "#1DB954", amount: "159 CZK", days: "in 12 days"  },
  { letter: "i", name: "iCloud",   color: "#0071E3", amount: "49 CZK",  days: "in 5 days"   },
  { letter: "G", name: "ChatGPT",  color: "#10A37F", amount: "590 CZK", days: "in 18 days"  },
  { letter: "Y", name: "YouTube",  color: "#FF4444", amount: "189 CZK", days: "in 7 days"   },
  { letter: "F", name: "Figma",    color: "#F24E1E", amount: "890 CZK", days: "in 14 days"  },
  { letter: "D", name: "Discord",  color: "#5865F2", amount: "99 CZK",  days: "in 21 days"  },
  { letter: "N", name: "Notion",   color: "#6366F1", amount: "349 CZK", days: "in 9 days"   },
  { letter: "S", name: "Slack",    color: "#E01E5A", amount: "420 CZK", days: "in 2 days"   },
  { letter: "G", name: "GitHub",   color: "#7C3AED", amount: "250 CZK", days: "in 16 days"  },
] as const;

const STEPS = 28;

export function HeroPhone() {
  const { width: screenW } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const screenBg = colorScheme === "dark" ? "#0a0a0a" : "#fafafa";
  const translateY = useSharedValue(0);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((reduceMotion) => {
      if (reduceMotion) return;
      translateY.value = withRepeat(
        withTiming(-CYCLE, { duration: 9000, easing: Easing.linear }),
        -1,
        false
      );
    });
  }, [translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // How far left/right of the phone the side covers should extend
  const sideW = (screenW - PHONE_W) / 2 + 8;

  return (
    <View
      style={{
        width: screenW,
        height: CROP_H,
        overflow: "hidden",
        alignItems: "center",
      }}
    >
      {/* ── 3D phone shell (no border-radius clipping relied upon for content) ── */}
      <View
        style={{
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: 36,
          borderWidth: 1.5,
          borderColor: "#252525",
          backgroundColor: BG,
          overflow: "hidden",
          transform: [
            { perspective: 780 },
            { rotateY: "-36deg" },
            { rotateX: "10deg" },
          ],
        }}
      >
        {/* ── Card clip container ──
            Rectangular (no borderRadius) inset from phone edges.
            Rectangular overflow:hidden works reliably with 3D parent transforms. */}
        <View
          style={{
            position: "absolute",
            top: CARDS_TOP,
            left: INSET,
            right: INSET,
            bottom: INSET,
            overflow: "hidden",
          }}
        >
          <Animated.View style={[{ gap: CARD_GAP, paddingHorizontal: 4 }, animStyle]}>
            {[...SERVICES, ...SERVICES].map((s, i) => (
              <View
                key={i}
                style={{
                  height: CARD_H,
                  backgroundColor: "#161616",
                  borderWidth: 1,
                  borderColor: "#202020",
                  borderRadius: 14,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 9,
                }}
              >
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    backgroundColor: s.color + "1a",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: "800", color: s.color }}>
                    {s.letter}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: "600", color: "#d8d8d8" }}>
                    {s.name}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#333", marginTop: 1 }}>
                    {s.days}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#d8d8d8" }}>
                  {s.amount}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* ── Top solid cap — covers the island zone and any card bleed ── */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: CARDS_TOP,
            backgroundColor: BG,
            zIndex: 20,
          }}
        />

        {/* ── Dynamic island ── */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 13,
            alignSelf: "center",
            width: 54,
            height: 19,
            backgroundColor: "#000",
            borderRadius: 10,
            zIndex: 25,
          }}
        />

        {/* ── Top fade: 24px total, steps overlap 2× for zero banding ── */}
        {Array.from({ length: STEPS }, (_, i) => {
          const step = 24 / STEPS;
          return (
            <View
              key={`t${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                top: CARDS_TOP + i * step,
                left: 0, right: 0,
                height: step * 2,          // 100 % overlap → no visible bands
                backgroundColor: BG,
                opacity: 1 - i / (STEPS - 1),
                zIndex: 18,
              }}
            />
          );
        })}

        {/* ── Bottom fade: 70px total, reaches full opacity 20px before crop ── */}
        {Array.from({ length: STEPS }, (_, i) => {
          const step = 70 / STEPS;
          return (
            <View
              key={`b${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                top: (CROP_H - 70) + i * step,
                left: 0, right: 0,
                height: step * 2,
                backgroundColor: BG,
                opacity: i / (STEPS - 1),
                zIndex: 18,
              }}
            />
          );
        })}

        {/* Solid strip at the very bottom of crop — ensures corner is fully covered */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: CROP_H - 22,
            left: 0, right: 0,
            height: 22,
            backgroundColor: BG,
            zIndex: 19,
          }}
        />
      </View>

      {/* ── Side covers ──
          Screen-bg-coloured strips to the left and right of the phone.
          Hides any border/frame bleed that escapes overflow:hidden due to 3D transform. */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: sideW,
          height: CROP_H,
          backgroundColor: screenBg,
          zIndex: 50,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0, right: 0,
          width: sideW,
          height: CROP_H,
          backgroundColor: screenBg,
          zIndex: 50,
        }}
      />
    </View>
  );
}
