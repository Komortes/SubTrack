import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { Dimensions, ScrollView, Share, Text, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ServiceIcon } from "@/components/ServiceIcon";
import { formatMoney } from "@/lib/subscriptionMath";
import { computeWrappedStats } from "@/lib/wrappedStats";
import { useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_COUNT = 5;

export default function WrappedScreen() {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const primaryCurrency = useSettingsStore((s) => s.primaryCurrency);
  const rates = useCurrencyStore((s) => s.rates);
  const stats = computeWrappedStats(subscriptions, primaryCurrency, rates);

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const dotScale = useSharedValue(1);
  const dotStyle = useAnimatedStyle(() => ({ transform: [{ scale: dotScale.value }] }));

  function goTo(next: number) {
    dotScale.value = withSpring(0.8, { damping: 10, reduceMotion: ReduceMotion.System }, () => {
      dotScale.value = withSpring(1, { damping: 10, reduceMotion: ReduceMotion.System });
    });
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  }

  async function shareWrapped() {
    const top = stats.topSubscription;
    const msg = [
      `📊 My ${stats.year} Subscription Wrapped`,
      `💸 Total spent: ${formatMoney(stats.totalSpent, stats.currency)}`,
      top ? `🏆 Biggest: ${top.name} — ${formatMoney(top.total, stats.currency)}` : null,
      stats.longestRunning ? `📅 Longest: ${stats.longestRunning.name} (${stats.longestRunning.months}mo)` : null,
      `📱 Tracked ${stats.trackedCount} subscriptions`,
      "\nTracked with SubTrack",
    ].filter(Boolean).join("\n");
    await Share.share({ message: msg });
  }

  const cards = [
    <FadeInView key="total" className="flex-1 items-center justify-center px-10">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{stats.year}</Text>
      <Text className="mt-6 text-center text-5xl font-bold tracking-tighter text-ink">
        {formatMoney(stats.totalSpent, stats.currency)}
      </Text>
      <Text className="mt-4 text-center text-lg text-subtle">total spent on subscriptions</Text>
    </FadeInView>,

    <FadeInView key="top" className="flex-1 items-center justify-center px-10">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">your biggest</Text>
      {stats.topSubscription ? (
        <>
          <View className="mt-6">
            <ServiceIcon name={stats.topSubscription.name} iconSlug={stats.topSubscription.iconSlug} color={stats.topSubscription.color} size={72} />
          </View>
          <Text className="mt-5 text-3xl font-bold text-ink">{stats.topSubscription.name}</Text>
          <Text className="mt-2 text-2xl font-semibold text-subtle">
            {formatMoney(stats.topSubscription.total, stats.currency)} / year
          </Text>
        </>
      ) : (
        <Text className="mt-6 text-center text-subtle">No data yet</Text>
      )}
    </FadeInView>,

    <FadeInView key="longest" className="flex-1 items-center justify-center px-10">
      <Text className="text-xs font-semibold uppercase tracking-widest text-muted">longest running</Text>
      {stats.longestRunning ? (
        <>
          <View className="mt-6">
            <ServiceIcon name={stats.longestRunning.name} iconSlug={stats.longestRunning.iconSlug} color={stats.longestRunning.color} size={72} />
          </View>
          <Text className="mt-5 text-3xl font-bold text-ink">{stats.longestRunning.name}</Text>
          <Text className="mt-2 text-xl font-semibold text-subtle">{stats.longestRunning.months} months</Text>
        </>
      ) : (
        <Text className="mt-6 text-center text-subtle">No data yet</Text>
      )}
    </FadeInView>,

    <FadeInView key="categories" className="flex-1 justify-center px-8">
      <Text className="mb-6 text-center text-xs font-semibold uppercase tracking-widest text-muted">by category</Text>
      <View className="gap-3">
        {stats.categoryBreakdown.slice(0, 4).map((item, i) => {
          const pct = stats.totalSpent > 0 ? item.total / stats.totalSpent : 0;
          return (
            <FadeInView key={item.category} index={i}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold capitalize text-ink">{item.category}</Text>
                <Text className="text-sm font-semibold text-muted">{formatMoney(item.total, stats.currency)}</Text>
              </View>
              <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                <View className="h-1.5 rounded-full bg-ink" style={{ width: `${pct * 100}%` }} />
              </View>
            </FadeInView>
          );
        })}
      </View>
    </FadeInView>,

    <FadeInView key="closing" className="flex-1 items-center justify-center px-10">
      <Text className="text-5xl">🎉</Text>
      <Text className="mt-6 text-center text-2xl font-bold text-ink">
        You tracked {stats.trackedCount} subscription{stats.trackedCount !== 1 ? "s" : ""}
      </Text>
      <Text className="mt-3 text-center text-base text-subtle">in {stats.year}</Text>
      <AnimatedPressable
        className="mt-10 flex-row items-center gap-2 rounded-2xl bg-accent px-6 py-4"
        onPress={shareWrapped}
      >
        <Feather name="share-2" size={16} color="#0a0a0a" />
        <Text className="font-bold text-bg">Share your Wrapped</Text>
      </AnimatedPressable>
    </FadeInView>,
  ];

  return (
    <View className="flex-1 bg-bg">
      <View className="flex-row items-center justify-between px-5 pb-4 pt-16">
        <Text className="text-lg font-bold text-ink">Wrapped {stats.year}</Text>
        <AnimatedPressable onPress={() => router.back()} hapticFeedback={false} scaleTarget={0.88} style={{ padding: 8 }}>
          <Feather name="x" size={22} color="#a3a3a3" />
        </AnimatedPressable>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={{ flex: 1 }}
      >
        {cards.map((card, i) => (
          <View key={i} style={{ width: SCREEN_WIDTH, flex: 1 }}>
            {card}
          </View>
        ))}
      </ScrollView>

      <View className="flex-row items-center justify-between px-6 pb-12 pt-4">
        <AnimatedPressable
          onPress={() => index > 0 && goTo(index - 1)}
          style={{ opacity: index === 0 ? 0 : 1, padding: 8 }}
          hapticFeedback={false}
        >
          <Feather name="chevron-left" size={24} color="#fafafa" />
        </AnimatedPressable>

        <View className="flex-row items-center gap-2">
          {Array.from({ length: CARD_COUNT }).map((_, i) => (
            <Animated.View
              key={i}
              style={[
                i === index ? dotStyle : undefined,
                { width: i === index ? 20 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? "#fafafa" : "#404040" },
              ]}
            />
          ))}
        </View>

        <AnimatedPressable
          onPress={() => (index < CARD_COUNT - 1 ? goTo(index + 1) : router.back())}
          style={{ padding: 8 }}
          hapticFeedback={false}
        >
          <Feather name={index < CARD_COUNT - 1 ? "chevron-right" : "check"} size={24} color="#fafafa" />
        </AnimatedPressable>
      </View>
    </View>
  );
}
