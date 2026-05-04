import { Link, router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const useOfflineMode = useAuthStore((state) => state.useOfflineMode);

  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-ink">Вход</Text>
      <Text className="mt-2 text-base text-muted">Синхронизируй подписки между устройствами.</Text>
      <TextInput className="mt-8 rounded-2xl border border-line px-4 py-4" placeholder="Email" autoCapitalize="none" />
      <TextInput className="mt-3 rounded-2xl border border-line px-4 py-4" placeholder="Пароль" secureTextEntry />
      <Pressable className="mt-5 rounded-2xl bg-ink px-5 py-4" onPress={() => router.replace("/(app)/(tabs)")}>
        <Text className="text-center font-semibold text-white">Войти</Text>
      </Pressable>
      <Pressable
        className="mt-3 px-5 py-4"
        onPress={() => {
          useOfflineMode();
          router.replace("/(app)/(tabs)");
        }}
      >
        <Text className="text-center font-semibold text-accent">Продолжить офлайн</Text>
      </Pressable>
      <Link href="/(auth)/register" className="mt-6 text-center text-muted">
        Нет аккаунта? Зарегистрироваться
      </Link>
    </View>
  );
}

