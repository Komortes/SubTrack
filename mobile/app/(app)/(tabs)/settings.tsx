import { useEffect } from "react";
import { router } from "expo-router";
import { Alert, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { shareSubscriptionsCsv } from "@/lib/exportCsv";
import { syncLocalRenewalNotifications } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const notificationTimes = ["08:00", "09:00", "10:00", "18:00"];
const currencies = ["CZK", "EUR", "USD"] as const;
const dateFormats = ["DD.MM.YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
const themes = ["system", "dark", "light"] as const;

function Divider() {
  return <View className="mx-4 h-px bg-border" />;
}

function SettingsRow({
  label,
  sublabel,
  value,
  right,
  danger,
  onPress,
}: {
  label: string;
  sublabel?: string;
  value?: string;
  right?: React.ReactNode;
  danger?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <View className="flex-1">
        <Text className={`text-base ${danger ? "text-danger" : "text-ink"}`}>{label}</Text>
        {sublabel ? <Text className="mt-0.5 text-xs text-muted">{sublabel}</Text> : null}
      </View>
      {value ? <Text className="mr-2 text-subtle">{value}</Text> : null}
      {right}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity className="flex-row items-center justify-between px-4 py-3" onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      {content}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="mb-2 mt-5 px-1 text-xs font-semibold uppercase tracking-widest text-muted">{title}</Text>
  );
}

export default function SettingsScreen() {
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
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);
  const pendingSyncCount = useSubscriptionStore((state) => state.pendingSyncCount);
  const refreshPendingSyncCount = useSubscriptionStore((state) => state.refreshPendingSyncCount);
  const syncSubscriptions = useSubscriptionStore((state) => state.syncFromServer);
  const deleteAllSubscriptions = useSubscriptionStore((state) => state.deleteAllSubscriptions);
  const resetSubscriptions = useSubscriptionStore((state) => state.resetSubscriptions);
  const { register, sendTestNotification } = usePushNotifications();

  useEffect(() => {
    refreshPendingSyncCount().catch(() => undefined);

    if (!isOfflineMode) {
      syncSettings().catch(() => undefined);
    }
  }, [isOfflineMode, refreshPendingSyncCount, syncSettings]);

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
      { text: "Отмена", style: "cancel" as const }
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
          token ? "Уведомления включены" : "Нет разрешения",
          token ? "Push-токен сохранён для серверных напоминаний." : "Разреши уведомления в настройках iOS."
        );
        return;
      }

      const count = await syncLocalRenewalNotifications(
        subscriptions,
        { notifyThreeDays, notifyOneDay, notifySameDay, notificationTime },
        { requestPermission: true }
      );
      Alert.alert(
        count > 0 ? "Уведомления включены" : "Нет ближайших напоминаний",
        count > 0 ? `Запланировано локальных напоминаний: ${count}.` : "Проверь даты списаний и включённые интервалы."
      );
    } catch {
      Alert.alert("Не удалось включить уведомления", "Проверь системные разрешения и попробуй ещё раз.");
    }
  }

  async function exportCsv() {
    await shareSubscriptionsCsv(subscriptions);
  }

  async function syncNow() {
    if (isOfflineMode) {
      Alert.alert("Офлайн режим", "Синхронизация доступна после входа в аккаунт.");
      return;
    }

    try {
      await syncSubscriptions();
      await syncSettings();
      await refreshPendingSyncCount();
      Alert.alert("Синхронизация завершена", "Локальная очередь отправлена на сервер.");
    } catch {
      Alert.alert("Не удалось синхронизировать", "Проверь сервер или подключение и попробуй ещё раз.");
    }
  }

  async function removeAccount() {
    await deleteAccount();
    resetSubscriptions();
    resetSettings();
    router.replace("/onboarding");
  }

  function confirmLogout() {
    Alert.alert("Выйти?", "Локальные данные останутся на устройстве.", [
      { text: "Отмена", style: "cancel" },
      { text: "Выйти", style: "destructive", onPress: () => logout().catch(() => undefined) }
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert("Удалить все подписки?", "Это очистит список подписок. Если сервер недоступен, действие попадёт в очередь синхронизации.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => deleteAllSubscriptions().catch(() => undefined) }
    ]);
  }

  function confirmDeleteAccount() {
    Alert.alert("Удалить аккаунт?", "Аккаунт и серверные данные будут удалены. Это действие нельзя отменить.", [
      { text: "Отмена", style: "cancel" },
      { text: "Удалить", style: "destructive", onPress: () => removeAccount().catch(() => undefined) }
    ]);
  }

  return (
    <ScreenTransition className="flex-1 bg-bg">
      <ScrollView className="flex-1 bg-bg" contentContainerClassName="px-5 pb-10 pt-16">
        <Text className="mb-1 text-3xl font-bold tracking-tight text-ink">Настройки</Text>

        <FadeInView index={0}>
          <SectionHeader title="Аккаунт" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              label="Офлайн режим"
              right={
                <Switch
                  value={!!isOfflineMode}
                  thumbColor="#fafafa"
                  trackColor={{ false: "#1f1f1f", true: "#525252" }}
                />
              }
            />
            <Divider />
            <TouchableOpacity onPress={confirmLogout}>
              <SettingsRow label="Выйти" danger right={<Text className="text-lg text-danger">→</Text>} />
            </TouchableOpacity>
            <Divider />
            <SettingsRow
              label="Удалить аккаунт"
              sublabel="Аккаунт и серверные данные будут удалены"
              danger
              right={<Text className="text-base text-danger">✕</Text>}
              onPress={confirmDeleteAccount}
            />
          </View>
        </FadeInView>

        <FadeInView index={1}>
          <SectionHeader title="Уведомления" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              label="За 3 дня"
              sublabel="Предупреждение о списании"
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
              label="За 1 день"
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
              label="В день списания"
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
              label="Время уведомления"
              value={notificationTime}
              right={<Text className="text-base text-subtle">›</Text>}
              onPress={() => chooseSetting("Время уведомления", notificationTimes, notificationTime, (value) => setSetting({ notificationTime: value }))}
            />
          </View>
          <AnimatedPressable
            className="mt-3 rounded-xl bg-accent px-4 py-3"
            onPress={enableNotifications}
          >
            <Text className="text-center font-semibold text-bg">Включить уведомления</Text>
          </AnimatedPressable>
          <AnimatedPressable
            className="mt-3 rounded-xl border border-border bg-surface px-4 py-3"
            onPress={testNotification}
          >
            <Text className="text-center font-semibold text-ink">Тест уведомления</Text>
          </AnimatedPressable>
        </FadeInView>

        <FadeInView index={2}>
          <SectionHeader title="Внешний вид" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              label="Валюта"
              value={primaryCurrency}
              right={<Text className="text-base text-subtle">›</Text>}
              onPress={() => chooseSetting("Основная валюта", currencies, primaryCurrency, (value) => setSetting({ primaryCurrency: value }))}
            />
            <Divider />
            <SettingsRow
              label="Формат даты"
              value={dateFormat}
              right={<Text className="text-base text-subtle">›</Text>}
              onPress={() => chooseSetting("Формат даты", dateFormats, dateFormat, (value) => setSetting({ dateFormat: value }))}
            />
            <Divider />
            <SettingsRow
              label="Тема"
              value={theme === "system" ? "Системная" : theme === "dark" ? "Тёмная" : "Светлая"}
              right={<Text className="text-base text-subtle">›</Text>}
              onPress={() =>
                chooseSetting("Тема", themes, theme, (value) => setSetting({ theme: value }), (value) =>
                  value === "system" ? "Системная" : value === "dark" ? "Тёмная" : "Светлая"
                )
              }
            />
          </View>
        </FadeInView>

        <FadeInView index={3}>
          <SectionHeader title="Данные" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              label="Синхронизировать сейчас"
              sublabel={
                pendingSyncCount > 0
                  ? `В очереди изменений: ${pendingSyncCount}`
                  : "Обновить данные и настройки"
              }
              right={<Text className="text-base text-subtle">↻</Text>}
              onPress={syncNow}
            />
            <Divider />
            <SettingsRow
              label="Экспорт CSV"
              right={<Text className="text-base text-subtle">↓</Text>}
              onPress={() => {
                exportCsv().catch(() => undefined);
              }}
            />
            <Divider />
            <SettingsRow
              label="Удалить все данные"
              danger
              right={<Text className="text-base text-danger">✕</Text>}
              onPress={confirmDeleteAll}
            />
          </View>
        </FadeInView>

        <Text className="mt-8 text-center text-xs text-muted">SubTrack v2.4.0 (Build 108)</Text>
      </ScrollView>
    </ScreenTransition>
  );
}
