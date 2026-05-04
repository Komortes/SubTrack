import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { sendLocalTestNotification } from "@/lib/notifications";
import { useAuthStore } from "@/store/authStore";

export default function SettingsScreen() {
  const email = useAuthStore((state) => state.email);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-5 px-5 pb-10 pt-16">
      <Text className="text-3xl font-bold text-ink">Настройки</Text>
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="text-base font-semibold text-ink">Аккаунт</Text>
        <Text className="mt-2 text-muted">{email ?? "Офлайн режим"}</Text>
        <Pressable className="mt-4 rounded-xl bg-surface px-4 py-3" onPress={logout}>
          <Text className="text-center font-semibold text-ink">Выйти</Text>
        </Pressable>
      </View>
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="text-base font-semibold text-ink">Уведомления</Text>
        {["За 3 дня", "За 1 день", "В день списания"].map((label) => (
          <View key={label} className="mt-4 flex-row items-center justify-between">
            <Text className="text-ink">{label}</Text>
            <Switch value />
          </View>
        ))}
        <Text className="mt-4 text-muted">Время: 09:00</Text>
        <Pressable className="mt-4 rounded-xl bg-accent px-4 py-3" onPress={sendLocalTestNotification}>
          <Text className="text-center font-semibold text-white">Тест уведомления</Text>
        </Pressable>
      </View>
      <View className="rounded-2xl border border-line bg-white p-4">
        <Text className="text-base font-semibold text-ink">Отображение</Text>
        <Text className="mt-3 text-muted">Валюта: CZK</Text>
        <Text className="mt-2 text-muted">Формат даты: DD.MM.YYYY</Text>
        <Text className="mt-2 text-muted">Тема: Системная</Text>
      </View>
      <View className="rounded-2xl border border-red-100 bg-white p-4">
        <Text className="text-base font-semibold text-danger">Данные</Text>
        <Text className="mt-3 text-muted">Экспорт CSV и удаление аккаунта добавим отдельным шагом.</Text>
      </View>
    </ScrollView>
  );
}

