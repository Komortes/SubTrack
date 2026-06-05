import { useCallback, useEffect, useState } from "react";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Alert, Linking, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { useProStatus } from "@/hooks/useProStatus";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { exportBackup, restoreFromFile, getLastBackupDate } from "@/lib/icloudBackup";
import { ProGate } from "@/components/ProGate";
import { shareSubscriptionsCsv } from "@/lib/exportCsv";
import { pickSubscriptionsCsv } from "@/lib/importCsv";
import { syncLocalRenewalNotifications } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";
import { useCurrencyStore } from "@/store/currencyStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import * as LocalAuthentication from "expo-local-authentication";

const notificationTimes = ["08:00", "09:00", "10:00", "18:00"];
const currencies = ["CZK", "EUR", "USD"] as const;
const dateFormats = ["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
const themes = ["system", "dark", "light"] as const;

function Divider() {
  return <View className="mx-5 h-px bg-border" />;
}

function SettingsRow({
  icon,
  label,
  sublabel,
  value,
  right,
  danger,
  onPress,
}: {
  icon?: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  value?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View className="flex-1 flex-row items-center gap-3 pr-3">
        {icon ? (
          <View className={`h-9 w-9 items-center justify-center rounded-xl ${danger ? "bg-danger/10" : "bg-bg"}`}>
            <Feather name={icon} size={16} color={danger ? "#ef4444" : "#a3a3a3"} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className={`text-base ${danger ? "text-danger" : "text-ink"}`}>{label}</Text>
          {sublabel ? <Text className="mt-0.5 text-xs text-muted">{sublabel}</Text> : null}
        </View>
      </View>
      {value ? <Text className="mr-2 text-sm text-subtle">{value}</Text> : null}
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity className="flex-row items-center justify-between px-5 py-4" onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center justify-between px-5 py-4">
      {content}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-7 px-1 text-sm font-semibold text-muted">{title}</Text>
  );
}

function SyncStatusCard({
  isOfflineMode,
  email,
  pendingSyncCount,
  lastSyncedAt,
}: {
  isOfflineMode: boolean;
  email?: string | null;
  pendingSyncCount: number;
  lastSyncedAt?: string | null;
}) {
  const { t } = useTranslation();
  const statusText = isOfflineMode
    ? t("common.offline")
    : pendingSyncCount > 0
      ? t("common.inQueue", { count: pendingSyncCount })
      : t("common.synced");
  const detail = isOfflineMode
    ? t("settings.rows.offlineModeSubtitle")
    : lastSyncedAt
      ? `${t("settings.rows.lastBackup", { date: new Date(lastSyncedAt).toLocaleString() })}`
      : t("common.syncing");

  return (
    <View className="mt-5 rounded-3xl border border-border bg-surface p-5">
      <View className="flex-row items-start justify-between gap-4">
        <View className="flex-1">
          <Text className="text-subtle" style={{ fontSize: 10, fontWeight: "700", letterSpacing: 4, textTransform: "uppercase" }}>{t("settings.sections.account")}</Text>
          <Text className="mt-2 text-xl font-bold text-ink" numberOfLines={1}>
            {email ?? t("settings.rows.offlineMode")}
          </Text>
          <Text className="mt-1 text-sm text-subtle">{detail}</Text>
        </View>
        <View className={`rounded-full px-3 py-1.5 ${pendingSyncCount > 0 ? "bg-danger/10" : "bg-bg"}`}>
          <Text className={`text-xs font-semibold ${pendingSyncCount > 0 ? "text-danger" : "text-muted"}`}>
            {statusText}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const isPro = useProStatus();
  const logout = useAuthStore((state) => state.logout);
  const deleteAccount = useAuthStore((state) => state.deleteAccount);
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);
  const notifyThreeDays = useSettingsStore((state) => state.notifyThreeDays);
  const notifyOneDay = useSettingsStore((state) => state.notifyOneDay);
  const notifySameDay = useSettingsStore((state) => state.notifySameDay);
  const notificationTime = useSettingsStore((state) => state.notificationTime);
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const dateFormat = useSettingsStore((state) => state.dateFormat);
  const theme = useSettingsStore((state) => state.theme);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const syncSettings = useSettingsStore((state) => state.syncFromServer);
  const resetSettings = useSettingsStore((state) => state.resetSettings);
  const biometricLockEnabled = useSettingsStore((state) => state.biometricLockEnabled);
  const biometricLockTimeout = useSettingsStore((state) => state.biometricLockTimeout);
  const setBiometricLock = useSettingsStore((state) => state.setBiometricLock);
  const setBiometricLockTimeout = useSettingsStore((state) => state.setBiometricLockTimeout);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isTogglingBiometric, setIsTogglingBiometric] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const email = useAuthStore((state) => state.email);
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const lastSyncedAt = useSubscriptionStore((state) => state.lastSyncedAt);
  const refreshPendingSyncCount = useSubscriptionStore((state) => state.refreshPendingSyncCount);
  const syncSubscriptions = useSubscriptionStore((state) => state.syncFromServer);
  const importSubscriptions = useSubscriptionStore((state) => state.importSubscriptions);
  const deleteAllSubscriptions = useSubscriptionStore((state) => state.deleteAllSubscriptions);
  const resetSubscriptions = useSubscriptionStore((state) => state.resetSubscriptions);
  const rates = useCurrencyStore((state) => state.rates);
  const lastUpdated = useCurrencyStore((state) => state.lastUpdated);
  const isFetchingRates = useCurrencyStore((state) => state.isFetching);
  const fetchRates = useCurrencyStore((state) => state.fetchRates);
  const { register, sendTestNotification } = usePushNotifications();

  useEffect(() => {
    refreshPendingSyncCount().catch(() => undefined);

    if (!isOfflineMode) {
      syncSettings().catch(() => undefined);
    }

    Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ])
      .then(([hasHardware, isEnrolled]) => {
        setBiometricAvailable(hasHardware && isEnrolled);
      })
      .catch(() => undefined);
  }, [isOfflineMode, refreshPendingSyncCount, syncSettings]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
      ])
        .then(([hasHardware, isEnrolled]) => {
          setBiometricAvailable(hasHardware && isEnrolled);
        })
        .catch(() => undefined);
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      getLastBackupDate().then(setLastBackupDate);
    }, [])
  );

  function setSetting<T extends Parameters<typeof updateSettings>[0]>(patch: T) {
    updateSettings(patch, !isOfflineMode).catch(() => undefined);
  }

  function chooseSetting<T extends string>(
    title: string,
    items: readonly T[],
    current: T,
    onSelect: (value: T) => void,
    labelFor: (value: T) => string = (value) => value
  ) {
    Alert.alert(title, undefined, [
      ...items.map((item) => ({
        text: `${item === current ? "✓ " : ""}${labelFor(item)}`,
        onPress: () => onSelect(item)
      })),
      { text: t("common.cancel"), style: "cancel" as const }
    ]);
  }

  async function testNotification() {
    try {
      if (!isOfflineMode) {
        await register();
      }
      await sendTestNotification();
    } catch {
      await sendTestNotification();
    }
  }

  async function enableNotifications() {
    try {
      if (!isOfflineMode) {
        const token = await register();
        Alert.alert(
          token ? t("settings.sections.notifications") : t("common.error"),
          token ? t("settings.rows.notify3Days") : t("common.error")
        );
        return;
      }

      const count = await syncLocalRenewalNotifications(
        subscriptions,
        { notifyThreeDays, notifyOneDay, notifySameDay, notificationTime },
        { requestPermission: true }
      );
      Alert.alert(
        count > 0 ? t("settings.sections.notifications") : t("common.error"),
        count > 0 ? t("settings.rows.pendingSync", { count }) : t("common.error")
      );
    } catch {
      Alert.alert(t("common.error"), t("common.error"));
    }
  }

  async function exportCsv() {
    await shareSubscriptionsCsv(subscriptions);
  }

  async function importCsv() {
    try {
      const result = await pickSubscriptionsCsv();
      if (!result) return;

      if (result.subscriptions.length === 0) {
        Alert.alert(t("settings.rows.importCsv"), t("common.error"));
        return;
      }

      const summary = await importSubscriptions(result.subscriptions);
      Alert.alert(
        t("settings.rows.importCsv"),
        `${t("common.add")}: ${summary.created}. ${t("common.save")}: ${summary.updated}.`
      );
    } catch {
      Alert.alert(t("common.error"), t("common.error"));
    }
  }

  async function handleBackupNow() {
    try {
      await exportBackup();
      const date = await getLastBackupDate();
      setLastBackupDate(date);
      Alert.alert(t("backup.exportSuccess"));
    } catch {
      Alert.alert(t("backup.exportError"));
    }
  }

  async function handleRestore() {
    try {
      const count = await restoreFromFile();
      if (count > 0) Alert.alert(t("backup.restoreSuccess", { count }));
    } catch (e: unknown) {
      Alert.alert((e as Error).message);
    }
  }

  async function exportByEmail() {
    await shareSubscriptionsCsv(subscriptions);
  }

  const canRefreshRates = !isFetchingRates && (!lastUpdated || (Date.now() - new Date(lastUpdated).getTime()) > 60 * 60 * 1000);

  async function refreshRates() {
    try {
      await fetchRates(true);
    } catch {
      Alert.alert(t("common.error"), t("common.error"));
    }
  }

  async function toggleBiometricLock(value: boolean) {
    if (isTogglingBiometric) return;
    if (value) {
      setIsTogglingBiometric(true);
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t("settings.rows.biometricLock"),
          cancelLabel: t("common.cancel"),
          disableDeviceFallback: true,
        });
        if (result.success) {
          setBiometricLock(true);
        }
      } catch {
        Alert.alert(t("common.error"), t("common.error"));
      } finally {
        setIsTogglingBiometric(false);
      }
      return;
    }
    setBiometricLock(false);
  }

  async function syncNow() {
    if (isOfflineMode) {
      Alert.alert(t("common.offline"), t("settings.rows.offlineModeSubtitle"));
      return;
    }

    try {
      await syncSubscriptions();
      await syncSettings();
      await refreshPendingSyncCount();
      Alert.alert(t("common.synced"), t("common.synced"));
    } catch {
      Alert.alert(t("common.error"), t("common.error"));
    }
  }

  async function removeAccount() {
    try {
      await deleteAccount();
    } catch {
      // server may be unreachable; local cleanup already happened in the store
    }
    resetSubscriptions();
    resetSettings();
    router.replace("/onboarding");
  }

  function confirmLogout() {
    Alert.alert(t("settings.rows.signOutConfirmTitle"), t("settings.rows.signOutConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.rows.signOut"),
        style: "destructive",
        onPress: async () => {
          await logout().catch(() => undefined);
          router.replace("/onboarding");
        }
      }
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert(t("settings.rows.deleteConfirmTitle"), t("settings.rows.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteAllSubscriptions().catch(() => undefined) }
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert(t("settings.rows.deleteConfirmTitle"), t("settings.rows.deleteConfirmMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => removeAccount().catch(() => undefined) }
    ]);
  }

  const themeLabel = (value: typeof themes[number]) =>
    value === "system" ? t("settings.rows.themeSystem") : value === "dark" ? t("settings.rows.themeDark") : t("settings.rows.themeLight");

  const lockTimeoutLabel = (value: number) => {
    if (value === 1) return t("settings.rows.lockTimeout1");
    if (value === 5) return t("settings.rows.lockTimeout5");
    if (value === 15) return t("settings.rows.lockTimeout15");
    return t("settings.rows.lockTimeout60");
  };

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 pb-36 pt-16">
        <Text className="text-3xl font-bold tracking-tight text-ink">{t("settings.title")}</Text>

        <SyncStatusCard
          isOfflineMode={!!isOfflineMode}
          email={email}
          pendingSyncCount={pendingSyncCount}
          lastSyncedAt={lastSyncedAt}
        />

        <FadeInView index={0}>
          <SectionHeader title={t("settings.sections.pro")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            {!isPro ? (
              <SettingsRow
                icon="star"
                label={t("settings.rows.upgradeToPro")}
                right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
                onPress={() => router.push("/(app)/paywall")}
              />
            ) : (
              <SettingsRow
                icon="star"
                label={t("settings.rows.proActive")}
                sublabel={t("settings.rows.managePro")}
                right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
                onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")}
              />
            )}
          </View>
        </FadeInView>

        <FadeInView index={1}>
          <SectionHeader title={t("settings.sections.account")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              icon="wifi-off"
              label={t("settings.rows.offlineMode")}
              sublabel={isOfflineMode ? t("settings.rows.offlineModeSubtitle") : t("common.syncing")}
              right={
                <Switch
                  value={!!isOfflineMode}
                  onValueChange={(value) => {
                    if (value) {
                      confirmLogout();
                    } else {
                      router.replace("/(auth)/login");
                    }
                  }}
                  thumbColor="#fafafa"
                  trackColor={{ false: "#1f1f1f", true: "#525252" }}
                />
              }
            />
            <Divider />
            <SettingsRow label={t("settings.rows.signOut")} icon="log-out" danger right={<Feather name="chevron-right" size={18} color="#ef4444" />} onPress={confirmLogout} />
            <Divider />
            <SettingsRow
              icon="trash-2"
              label={t("settings.rows.deleteAccount")}
              sublabel={t("settings.rows.deleteConfirmMessage")}
              danger
              right={<Feather name="x" size={17} color="#ef4444" />}
              onPress={confirmDeleteAccount}
            />
          </View>
        </FadeInView>

        <FadeInView index={2}>
          <SectionHeader title={t("settings.sections.notifications")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              icon="bell"
              label={t("settings.rows.notify3Days")}
              right={
                <Switch
                  value={notifyThreeDays}
                  onValueChange={(value) => setSetting({ notifyThreeDays: value })}
                  thumbColor="#fafafa"
                  trackColor={{ false: "#1f1f1f", true: "#525252" }}
                />
              }
            />
            <Divider />
            <SettingsRow
              icon="clock"
              label={t("settings.rows.notify1Day")}
              right={
                <Switch
                  value={notifyOneDay}
                  onValueChange={(value) => setSetting({ notifyOneDay: value })}
                  thumbColor="#fafafa"
                  trackColor={{ false: "#1f1f1f", true: "#525252" }}
                />
              }
            />
            <Divider />
            <SettingsRow
              icon="calendar"
              label={t("settings.rows.notifyOnDay")}
              right={
                <Switch
                  value={notifySameDay}
                  onValueChange={(value) => setSetting({ notifySameDay: value })}
                  thumbColor="#fafafa"
                  trackColor={{ false: "#1f1f1f", true: "#525252" }}
                />
              }
            />
            <Divider />
            <SettingsRow
              icon="watch"
              label={t("settings.rows.notificationTime")}
              value={notificationTime}
              right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
              onPress={() => chooseSetting(t("settings.rows.notificationTime"), notificationTimes, notificationTime, (value) => setSetting({ notificationTime: value }))}
            />
          </View>
          <View className="mt-3 flex-row gap-3">
            <AnimatedPressable
              className="flex-1 rounded-xl bg-accent px-4 py-3.5"
              onPress={enableNotifications}
            >
              <Text className="text-center text-sm font-semibold text-bg">{t("common.on")}</Text>
            </AnimatedPressable>
            <AnimatedPressable
              className="flex-1 rounded-xl border border-border bg-surface px-4 py-3.5"
              onPress={testNotification}
            >
              <Text className="text-center text-sm font-semibold text-ink">{t("settings.rows.testNotification")}</Text>
            </AnimatedPressable>
          </View>
        </FadeInView>

        <FadeInView index={3}>
          <SectionHeader title={t("settings.sections.display")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              icon="dollar-sign"
              label={t("settings.rows.currency")}
              value={primaryCurrency}
              right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
              onPress={() => chooseSetting(t("settings.rows.currency"), currencies, primaryCurrency, (value) => setSetting({ primaryCurrency: value }))}
            />
            <Divider />
            <SettingsRow
              icon="calendar"
              label={t("settings.rows.dateFormat")}
              value={dateFormat}
              right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
              onPress={() => chooseSetting(t("settings.rows.dateFormat"), dateFormats, dateFormat, (value) => setSetting({ dateFormat: value }))}
            />
            <Divider />
            <SettingsRow
              icon="moon"
              label={t("settings.rows.theme")}
              value={themeLabel(theme)}
              right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
              onPress={() =>
                chooseSetting(t("settings.rows.theme"), themes, theme, (value) => setSetting({ theme: value }), themeLabel)
              }
            />
          </View>
        </FadeInView>

        <FadeInView index={4}>
          <SectionHeader title={t("settings.sections.rates")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              icon="refresh-cw"
              label={t("common.syncing")}
              sublabel={
                isFetchingRates
                  ? t("common.loading")
                  : lastUpdated
                    ? `EUR ${rates.EUR.toFixed(2)} · USD ${rates.USD.toFixed(2)} · ${new Date(lastUpdated).toLocaleDateString()}`
                    : t("settings.rows.neverBacked")
              }
              right={<Feather name="refresh-cw" size={16} color={canRefreshRates ? "#a3a3a3" : "#525252"} />}
              onPress={canRefreshRates ? () => { refreshRates().catch(() => undefined); } : undefined}
            />
          </View>
        </FadeInView>

        <FadeInView index={5}>
          <SectionHeader title={t("settings.sections.data")} />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              icon="refresh-cw"
              label={t("common.syncing")}
              sublabel={
                pendingSyncCount > 0
                  ? t("settings.rows.pendingSync", { count: pendingSyncCount })
                  : lastSyncedAt
                    ? `${t("settings.rows.lastBackup", { date: new Date(lastSyncedAt).toLocaleString() })}`
                    : t("common.syncing")
              }
              right={<Feather name="refresh-cw" size={16} color="#a3a3a3" />}
              onPress={syncNow}
            />
            <Divider />
            <SettingsRow
              icon="download"
              label={t("settings.rows.exportCsv")}
              sublabel={isPro ? undefined : t("settings.rows.exportCsvSubtitle")}
              right={isPro ? undefined : <Feather name="lock" size={14} color="#3a3a3a" />}
              onPress={isPro ? () => { exportCsv().catch(() => undefined); } : () => router.push("/(app)/paywall")}
            />
            <Divider />
            <SettingsRow
              icon="upload"
              label={t("settings.rows.importCsv")}
              right={<Feather name="upload" size={16} color="#a3a3a3" />}
              onPress={() => {
                importCsv().catch(() => undefined);
              }}
            />
            <Divider />
            <ProGate
              fallback={
                <>
                  <SettingsRow
                    icon="cloud"
                    label={t("settings.rows.icloudBackup")}
                    sublabel={t("settings.rows.icloudBackupSubtitle")}
                    right={<Feather name="lock" size={14} color="#3a3a3a" />}
                    onPress={() => router.push("/(app)/paywall")}
                  />
                </>
              }
            >
              <SettingsRow
                icon="cloud"
                label={t("settings.rows.backupNow")}
                sublabel={
                  lastBackupDate
                    ? t("settings.rows.lastBackup", { date: new Date(lastBackupDate).toLocaleDateString() })
                    : t("settings.rows.neverBacked")
                }
                onPress={handleBackupNow}
              />
              <Divider />
              <SettingsRow
                icon="upload"
                label={t("settings.rows.restoreBackup")}
                onPress={handleRestore}
              />
            </ProGate>
            {!isOfflineMode ? (
              <>
                <Divider />
                <SettingsRow
                  icon="mail"
                  label={t("settings.rows.emailCsv")}
                  sublabel={email ?? undefined}
                  right={<Feather name="mail" size={16} color="#a3a3a3" />}
                  onPress={() => {
                    exportByEmail().catch(() => undefined);
                  }}
                />
              </>
            ) : null}
            <Divider />
            <SettingsRow
              icon="trash-2"
              label={t("settings.rows.deleteAllData")}
              danger
              right={<Feather name="x" size={17} color="#ef4444" />}
              onPress={confirmDeleteAll}
            />
          </View>
        </FadeInView>

        {biometricAvailable ? (
          <FadeInView index={6}>
            <SectionHeader title={t("settings.sections.security")} />
            <View className="overflow-hidden rounded-2xl border border-border bg-surface">
              <SettingsRow
                icon="lock"
                label={t("settings.rows.biometricLock")}
                right={
                  <Switch
                    value={biometricLockEnabled}
                    disabled={isTogglingBiometric}
                    onValueChange={(value) => {
                      toggleBiometricLock(value).catch(() => undefined);
                    }}
                    thumbColor="#fafafa"
                    trackColor={{ false: "#1f1f1f", true: "#525252" }}
                  />
                }
              />
              {biometricLockEnabled ? (
                <>
                  <Divider />
                  <SettingsRow
                    icon="clock"
                    label={t("settings.rows.lockTimeout")}
                    value={lockTimeoutLabel(biometricLockTimeout)}
                    right={<Feather name="chevron-right" size={18} color="#a3a3a3" />}
                    onPress={() => {
                      const options: Array<{ label: string; value: 1 | 5 | 15 | 60 }> = [
                        { label: t("settings.rows.lockTimeout1"), value: 1 },
                        { label: t("settings.rows.lockTimeout5"), value: 5 },
                        { label: t("settings.rows.lockTimeout15"), value: 15 },
                        { label: t("settings.rows.lockTimeout60"), value: 60 },
                      ];
                      Alert.alert(t("settings.rows.lockTimeout"), undefined, [
                        ...options.map(({ label, value }) => ({
                          text: `${value === biometricLockTimeout ? "✓ " : ""}${label}`,
                          onPress: () => setBiometricLockTimeout(value),
                        })),
                        { text: t("common.cancel"), style: "cancel" as const },
                      ]);
                    }}
                  />
                </>
              ) : null}
            </View>
          </FadeInView>
        ) : null}

        <Text className="mt-8 text-center text-xs text-muted">SubTrack v2.4.0 (Build 108)</Text>
      </ScrollView>
    </ScreenTransition>
  );
}
