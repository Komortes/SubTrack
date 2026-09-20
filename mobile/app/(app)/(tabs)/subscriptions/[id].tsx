import { useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Alert, Linking, ScrollView, Text, View } from "react-native";
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ServiceIcon } from "@/components/ServiceIcon";
import { formatDate, formatShortDate, toLocalDate, toLocalIsoDate } from "@/lib/dateFormat";
import { daysUntil, formatMoney, nextRenewalDate, normalizeMonthlyAmount } from "@/lib/subscriptionMath";
import { haptic } from "@/lib/haptics";
import { useIsDark } from "@/hooks/useIsDark";
import { useAuthStore } from "@/store/authStore";
import { convertAmount, useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { getCancelInfo } from "@/lib/catalog";
import { useSubscriptionStore } from "@/store/subscriptionStore";

function subtractDays(dateStr: string, days: number): string {
  const d = toLocalDate(dateStr);
  d.setDate(d.getDate() - days);
  return toLocalIsoDate(d);
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-2xl border border-border bg-bg p-3">
      <Text className="text-xs font-medium text-muted">{label}</Text>
      <Text className="mt-1 text-sm font-bold text-ink">{value}</Text>
    </View>
  );
}

function RenewalProgress({ progress, overdue }: { progress: number; overdue: boolean }) {
  const progressAnim = useSharedValue(0);
  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 600, reduceMotion: ReduceMotion.System });
  }, [progress, progressAnim]);
  const progressBarStyle = useAnimatedStyle(() => ({ width: `${progressAnim.value * 100}%` as unknown as number }));
  return <Animated.View className={`h-1.5 rounded-full ${overdue ? "bg-danger" : "bg-ink"}`} style={progressBarStyle} />;
}

export default function SubscriptionDetailsScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const subscription = useSubscriptionStore((state) => state.subscriptions.find((item) => item.id === id));
  const markPaid = useSubscriptionStore((state) => state.markPaid);
  const updateSubscription = useSubscriptionStore((state) => state.updateSubscription);
  const deleteSubscription = useSubscriptionStore((state) => state.deleteSubscription);
  const archiveSubscription = useSubscriptionStore((state) => state.archiveSubscription);
  const refreshSubscription = useSubscriptionStore((state) => state.refreshSubscription);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const dateFormat = useSettingsStore((state) => state.dateFormat);
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const rates = useCurrencyStore((state) => state.rates);
  const isDark = useIsDark();
  const [isMarkingPaid, setIsMarkingPaid] = useState(false);
  const headerBg = isDark ? "#0a0a0a" : "#fafafa";
  const headerTint = isDark ? "#fafafa" : "#0a0a0a";

  useEffect(() => {
    if (id && !isOfflineMode) {
      refreshSubscription(id).catch(() => undefined);
    }
  }, [id, isOfflineMode, refreshSubscription]);

  if (!subscription) {
    return (
      <View className="flex-1 items-center justify-center bg-bg px-6">
        <Text className="text-lg font-semibold text-ink">{t("home.noSubscriptions")}</Text>
      </View>
    );
  }

  const currentSubscription = subscription;
  const periodDays =
    currentSubscription.billingPeriod === "weekly" ? 7
    : currentSubscription.billingPeriod === "monthly" ? 30
    : currentSubscription.billingPeriod === "yearly" ? 365
    : (currentSubscription.customPeriodDays ?? 30);

  const daysLeft = daysUntil(currentSubscription.renewalDate);
  const progress = Math.max(0, Math.min(1, 1 - daysLeft / periodDays));

  const previousDateStr = subtractDays(currentSubscription.renewalDate, periodDays);
  const monthlyAmount = normalizeMonthlyAmount({ ...currentSubscription, isActive: true });
  const monthlyInPrimary = convertAmount(monthlyAmount, currentSubscription.currency, primaryCurrency, rates);
  const showConverted = currentSubscription.currency !== primaryCurrency;
  const subscriptionId = currentSubscription.id;
  const subscriptionName = currentSubscription.name;
  const renewalBadge =
    daysLeft === 0 ? t("subscriptions.detail.renewsToday")
    : daysLeft < 0 ? t("subscriptions.detail.overdueDays", { days: Math.abs(daysLeft), count: Math.abs(daysLeft) })
    : t("subscriptions.detail.renewsIn", { days: daysLeft });
  const statusLabel = subscription.isArchived
    ? t("subscriptions.detail.archived")
    : !subscription.isActive
      ? t("subscriptions.filters.paused")
      : subscription.isTrial
        ? t("subscriptions.detail.trial")
        : daysLeft < 0 ? t("subscriptions.detail.overdue") : daysLeft === 0
          ? t("subscriptions.detail.renewsToday") : t("subscriptions.filters.active");

  function confirmDeleteSubscription() {
    Alert.alert(t("subscriptions.detail.deleteConfirmTitle"), t("subscriptions.detail.deleteConfirmMessage", { name: subscriptionName }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          haptic.warning();
          deleteSubscription(subscriptionId).catch(() => undefined);
          router.back();
        }
      }
    ]);
  }

  function confirmMarkPaid() {
    Alert.alert(t("subscriptions.detail.confirmPaymentTitle"), t("subscriptions.detail.confirmPaymentMessage", {
      date: formatDate(nextRenewalDate(currentSubscription), dateFormat)
    }), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("subscriptions.detail.markPaid"), onPress: async () => {
        setIsMarkingPaid(true);
        try {
          await markPaid(subscriptionId);
          haptic.success();
        } catch {
          Alert.alert(t("common.error"));
        } finally {
          setIsMarkingPaid(false);
        }
      } }
    ]);
  }

  function toggleActive() {
    updateSubscription(subscriptionId, { isActive: !currentSubscription.isActive }).catch(() => undefined);
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: currentSubscription.name,
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: headerTint,
          headerTitleStyle: { color: headerTint, fontWeight: "600" },
          headerLeft: () => (
            <AnimatedPressable
              accessibilityLabel={t("common.back")}
              onPress={() => router.back()}
              hapticFeedback={false}
              scaleTarget={0.88}
              style={{ marginLeft: -4, padding: 8 }}
            >
              <Feather name="chevron-left" size={28} color={headerTint} />
            </AnimatedPressable>
          )
        }}
      />
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="pb-10">

        <View>
          <LinearGradient
            colors={[`${subscription.color}36`, `${subscription.color}10`, "transparent"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <FadeInView className="px-5 pb-5 pt-8">
            <View className="flex-row items-start gap-3">
              <ServiceIcon name={subscription.name} iconSlug={subscription.iconSlug} color={subscription.color} size={52} />
              <View className="flex-1">
                <Text className="text-2xl font-bold tracking-tight text-ink" numberOfLines={2}>{subscription.name}</Text>
                <Text className="mt-1 text-sm text-subtle">{t(`categories.${subscription.category}`, subscription.category)}</Text>
              </View>
            </View>
            <View className={`mt-3 self-start rounded-full px-3 py-1.5 ${subscription.isActive && !subscription.isArchived && daysLeft <= 0 ? "bg-danger/10" : "bg-surface"}`}>
              <Text className={`text-xs font-semibold ${subscription.isActive && !subscription.isArchived && daysLeft <= 0 ? "text-danger" : "text-muted"}`}>{statusLabel}</Text>
            </View>

            <View className="mt-7 rounded-3xl border border-border bg-surface p-5">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptionForm.fields.amount")} · {t(`billingPeriods.${subscription.billingPeriod}`)}</Text>
              <View className="mt-3 flex-row items-end gap-2">
                <Text className="text-4xl font-bold tracking-tighter text-ink" adjustsFontSizeToFit numberOfLines={1}>
                  {formatMoney(subscription.amount, subscription.currency)}
                </Text>
              </View>
              <Text className="mt-1.5 text-sm text-subtle">
                {showConverted
                  ? `≈ ${formatMoney(monthlyInPrimary, primaryCurrency)}${t("common.perMonth")}`
                  : `${formatMoney(monthlyAmount, subscription.currency)}${t("common.perMonth")}`}
              </Text>

              <View className="mt-5 flex-row gap-2">
                <DetailMetric label={t("subscriptionForm.fields.renewalDate")} value={formatDate(subscription.renewalDate, dateFormat)} />
                <DetailMetric label={t("subscriptions.detail.paymentStatus")} value={subscription.isActive && !subscription.isArchived ? renewalBadge : statusLabel} />
              </View>
            </View>
          </FadeInView>
        </View>

        <View className="gap-3 px-5">

          <FadeInView index={1} className="rounded-2xl border border-border bg-surface p-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptionForm.fields.billingPeriod")}</Text>
              <Text className="text-xs font-semibold text-subtle">{Math.round(progress * 100)}%</Text>
            </View>
            <View className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
              <RenewalProgress progress={progress} overdue={subscription.isActive && !subscription.isArchived && daysLeft <= 0} />
            </View>
            <View className="mt-2 flex-row justify-between">
              <Text className="text-xs text-muted">{formatShortDate(previousDateStr)}</Text>
              <Text className="text-xs text-muted">{formatShortDate(subscription.renewalDate)}</Text>
            </View>
          </FadeInView>

          <FadeInView index={2} className="flex-row gap-2">
            <AnimatedPressable
              className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface"
              accessibilityLabel={t("common.edit")}
              onPress={() => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}/edit`)}
            >
              <Feather name="edit-3" size={19} color="#a3a3a3" />
            </AnimatedPressable>
            <AnimatedPressable
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-accent"
              accessibilityLabel={subscription.isTrial ? t("subscriptions.detail.convertTrial") : t("subscriptions.detail.markPaid")}
              disabled={isMarkingPaid || subscription.isArchived}
              style={{ opacity: isMarkingPaid || subscription.isArchived ? 0.45 : 1 }}
              onPress={subscription.isTrial
                ? () => router.push(`/(app)/(tabs)/subscriptions/${subscription.id}/edit?convertTrial=1`)
                : confirmMarkPaid
              }
            >
              <Feather
                name={subscription.isTrial ? "play" : "check"}
                size={17}
                color={isDark ? "#0a0a0a" : "#fafafa"}
              />
              <Text className="font-semibold text-bg">
                {isMarkingPaid ? t("common.loading") : subscription.isTrial ? t("subscriptions.detail.convertTrial") : t("subscriptions.detail.markPaid")}
              </Text>
            </AnimatedPressable>
          </FadeInView>

          {subscription.notes ? (
            <FadeInView index={3} className="rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptionForm.fields.notes")}</Text>
              <Text className="mt-3 text-sm leading-5 text-subtle">{subscription.notes}</Text>
            </FadeInView>
          ) : null}

          <FadeInView index={subscription.notes ? 4 : 3} className="rounded-2xl border border-border bg-surface p-4">
            <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptions.detail.paymentHistory")}</Text>
            {subscription.paymentHistory?.length ? (
              <View className="mt-4 gap-4">
                {subscription.paymentHistory.slice(0, 5).map((record, index) => (
                  <View key={record.id} className="flex-row gap-3">
                    <View className="items-center">
                      <View className="h-3 w-3 rounded-full bg-ink" />
                      {index < Math.min(subscription.paymentHistory?.length ?? 0, 5) - 1 ? (
                        <View className="mt-1 h-8 w-px bg-border" />
                      ) : null}
                    </View>
                    <View className="flex-1 flex-row items-start justify-between gap-3">
                      <View>
                        <Text className="font-semibold text-ink">{formatShortDate(record.paidAt.slice(0, 10))}</Text>
                      <Text className="mt-0.5 text-xs text-muted">{t("subscriptions.detail.markPaid")}</Text>
                    </View>
                    <Text className="font-bold text-ink">{formatMoney(record.amount, record.currency)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text className="mt-3 text-sm text-subtle">{t("subscriptions.detail.noPayments")}</Text>
            )}
          </FadeInView>

          <FadeInView index={subscription.notes ? 5 : 4} className="gap-3 pb-4">
            <AnimatedPressable
              className="rounded-2xl border border-border bg-surface px-5 py-4"
              disabled={subscription.isArchived}
              style={{ display: subscription.isArchived ? "none" : "flex" }}
              onPress={toggleActive}
            >
              <Text className="text-center font-semibold text-ink">
                {subscription.isActive ? t("subscriptions.detail.pause") : t("subscriptions.detail.resume")}
              </Text>
            </AnimatedPressable>

            <AnimatedPressable
              className="rounded-2xl border border-border bg-surface px-5 py-4"
              onPress={() => {
                if (subscription.isArchived) {
                  updateSubscription(subscriptionId, { isArchived: false, isActive: true }).catch((error) => {
                    Alert.alert(t("common.error"), error instanceof Error && error.message === "FREE_LIMIT_REACHED" ? t("proGate.limitHint") : t("common.error"));
                  });
                  return;
                }
                Alert.alert(
                  t("subscriptions.detail.archive"),
                  subscriptionName,
                  [
                    { text: t("common.cancel"), style: "cancel" },
                    {
                      text: t("subscriptions.detail.archive"),
                      style: "destructive",
                      onPress: () => {
                        haptic.warning();
                        archiveSubscription(subscriptionId).catch(() => undefined);
                        router.back();
                      }
                    }
                  ]
                );
              }}
            >
              <Text className="text-center font-semibold text-muted">{t(subscription.isArchived ? "subscriptions.detail.unarchive" : "subscriptions.detail.archive")}</Text>
            </AnimatedPressable>

            <AnimatedPressable
              className="rounded-2xl border border-danger/20 bg-surface px-5 py-4"
              onPress={confirmDeleteSubscription}
            >
              <Text className="text-center text-xs font-semibold uppercase tracking-widest text-danger">
                {t("subscriptionForm.deleteButton")}
              </Text>
            </AnimatedPressable>
          </FadeInView>

          {getCancelInfo(subscription.iconSlug) ? (
            <FadeInView className="rounded-2xl border border-border bg-surface p-4">
              <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("subscriptions.detail.howToCancel", "How to Cancel")}</Text>
              <Text className="mt-2 text-sm leading-5 text-subtle">{t("subscriptions.detail.cancelHint", "Open the cancellation page for {{name}} and follow the instructions there.", { name: subscription.name })}</Text>
              <AnimatedPressable
                className="mt-3 flex-row items-center gap-2 rounded-xl border border-border bg-bg px-4 py-3"
                onPress={() => Linking.openURL(getCancelInfo(subscription.iconSlug)!.cancelUrl)}
              >
                <Feather name="external-link" size={15} color="#a3a3a3" />
                <Text className="text-sm font-semibold text-ink">{t("subscriptions.detail.openCancelPage", "Open cancellation page")}</Text>
              </AnimatedPressable>
            </FadeInView>
          ) : null}

        </View>
      </ScrollView>
    </>
  );
}
