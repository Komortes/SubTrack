import { ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { FadeInView } from "@/components/FadeInView";
import { ScreenTransition } from "@/components/ScreenTransition";
import { sendLocalTestNotification } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";

function Divider() {
  return <View className="mx-4 h-px bg-border" />;
}

function SettingsRow({
  label,
  sublabel,
  value,
  right,
  danger,
}: {
  label: string;
  sublabel?: string;
  value?: string;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <View className="flex-1">
        <Text className={`text-base ${danger ? "text-danger" : "text-ink"}`}>{label}</Text>
        {sublabel ? <Text className="mt-0.5 text-xs text-muted">{sublabel}</Text> : null}
      </View>
      {value ? <Text className="mr-2 text-subtle">{value}</Text> : null}
      {right}
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
  const isOfflineMode = useAuthStore((state) => state.isOfflineMode);

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
            <TouchableOpacity onPress={logout}>
              <SettingsRow label="Выйти" danger right={<Text className="text-lg text-danger">→</Text>} />
            </TouchableOpacity>
          </View>
        </FadeInView>

        <FadeInView index={1}>
          <SectionHeader title="Уведомления" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow
              label="За 3 дня"
              sublabel="Предупреждение о списании"
              right={
                <Switch value={true} thumbColor="#fafafa" trackColor={{ false: "#1f1f1f", true: "#525252" }} />
              }
            />
            <Divider />
            <SettingsRow
              label="За 1 день"
              right={
                <Switch value={false} thumbColor="#fafafa" trackColor={{ false: "#1f1f1f", true: "#525252" }} />
              }
            />
            <Divider />
            <SettingsRow
              label="В день списания"
              right={
                <Switch value={true} thumbColor="#fafafa" trackColor={{ false: "#1f1f1f", true: "#525252" }} />
              }
            />
            <Divider />
            <SettingsRow label="Время уведомления" value="09:00" />
          </View>
          <AnimatedPressable
            className="mt-3 rounded-xl border border-border bg-surface px-4 py-3"
            onPress={sendLocalTestNotification}
          >
            <Text className="text-center font-semibold text-ink">Тест уведомления</Text>
          </AnimatedPressable>
        </FadeInView>

        <FadeInView index={2}>
          <SectionHeader title="Внешний вид" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow label="Валюта" value="CZK" right={<Text className="text-base text-subtle">›</Text>} />
            <Divider />
            <SettingsRow
              label="Формат даты"
              value="DD.MM.YYYY"
              right={<Text className="text-base text-subtle">›</Text>}
            />
            <Divider />
            <SettingsRow label="Тема" value="Тёмная" right={<Text className="text-base text-subtle">›</Text>} />
          </View>
        </FadeInView>

        <FadeInView index={3}>
          <SectionHeader title="Данные" />
          <View className="overflow-hidden rounded-2xl border border-border bg-surface">
            <SettingsRow label="Экспорт CSV" right={<Text className="text-base text-subtle">↓</Text>} />
            <Divider />
            <SettingsRow label="Удалить все данные" danger right={<Text className="text-base text-danger">✕</Text>} />
          </View>
        </FadeInView>

        <Text className="mt-8 text-center text-xs text-muted">SubTrack v2.4.0 (Build 108)</Text>
      </ScrollView>
    </ScreenTransition>
  );
}
