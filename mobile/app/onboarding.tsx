import { Link } from "expo-router";
import { ScrollView, Text, View } from "react-native";

const slides = [
  ["Все подписки в одном месте", "Сервисы, облака, инструменты и домены живут в одном списке."],
  ["Никаких сюрпризов", "Напомним за 3 дня, за 1 день и в день списания."],
  ["Сколько ты тратишь?", "Покажем месяц, год и категории без ручных таблиц."]
];

export default function OnboardingScreen() {
  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="px-6 py-16">
      <View className="gap-5">
        {slides.map(([title, body], index) => (
          <View key={title} className="min-h-44 rounded-3xl bg-surface p-6">
            <Text className="text-sm font-semibold text-accent">0{index + 1}</Text>
            <Text className="mt-4 text-3xl font-bold text-ink">{title}</Text>
            <Text className="mt-3 text-base leading-6 text-muted">{body}</Text>
          </View>
        ))}
      </View>
      <Link href="/(auth)/register" className="mt-8 rounded-2xl bg-ink px-5 py-4 text-center font-semibold text-white">
        Создать аккаунт
      </Link>
      <Link href="/(app)/(tabs)" className="mt-3 px-5 py-4 text-center font-semibold text-accent">
        Продолжить офлайн
      </Link>
    </ScrollView>
  );
}

