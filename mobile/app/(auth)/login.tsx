import { Link, router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const enableOfflineMode = useAuthStore((state) => state.useOfflineMode);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit() {
    try {
      await login(email.trim(), password);
      router.replace("/(app)/(tabs)");
    } catch {
      // Error text is rendered from authStore.
    }
  }

  return (
    <View className="flex-1 justify-center bg-bg px-6">
      <Text className="text-3xl font-bold tracking-tight text-ink">Вход</Text>
      <Text className="mt-2 text-base text-subtle">Синхронизируй подписки между устройствами.</Text>
      <Text className="mt-8 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Email</Text>
      <TextInput
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
        placeholder="name@example.com"
        placeholderTextColor="#525252"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Text className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Пароль</Text>
      <TextInput
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
        placeholder="••••••••"
        placeholderTextColor="#525252"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text className="mt-3 text-sm font-medium text-danger">{error}</Text> : null}
      <AnimatedPressable className="mt-6 rounded-2xl bg-accent px-5 py-4" disabled={isLoading} onPress={submit}>
        <Text className="text-center font-semibold text-bg">{isLoading ? "Входим..." : "Войти"}</Text>
      </AnimatedPressable>
      <AnimatedPressable
        className="mt-3 rounded-2xl border border-border bg-surface px-5 py-4"
        onPress={() => {
          enableOfflineMode();
          router.replace("/(app)/(tabs)");
        }}
      >
        <Text className="text-center font-semibold text-subtle">Продолжить офлайн</Text>
      </AnimatedPressable>
      <Link href="/(auth)/register" className="mt-6 text-center text-muted">
        Нет аккаунта? Зарегистрироваться
      </Link>
    </View>
  );
}
