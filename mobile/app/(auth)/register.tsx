import { Link, router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit() {
    try {
      await register(email.trim(), password);
      router.replace("/(app)/(tabs)");
    } catch {
      // Error text is rendered from authStore.
    }
  }

  return (
    <View className="flex-1 justify-center bg-bg px-6">
      <Text className="text-3xl font-bold tracking-tight text-ink">Регистрация</Text>
      <Text className="mt-2 text-base text-subtle">Аккаунт нужен только для синхронизации.</Text>
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
      <View className="rounded-2xl border border-border bg-surface flex-row items-center pr-4">
        <TextInput
          className="flex-1 px-4 py-4 text-ink"
          placeholder="••••••••"
          placeholderTextColor="#525252"
          secureTextEntry={!showPassword}
          value={password}
          onChangeText={setPassword}
        />
        <Pressable onPress={() => setShowPassword((v) => !v)}>
          <Text className="text-muted text-sm">{showPassword ? "Скрыть" : "Показать"}</Text>
        </Pressable>
      </View>
      {error ? <Text className="mt-3 text-sm font-medium text-danger">{error}</Text> : null}
      <AnimatedPressable className="mt-6 rounded-2xl bg-accent px-5 py-4" disabled={isLoading} onPress={submit}>
        <Text className="text-center font-semibold text-bg">
          {isLoading ? "Создаем..." : "Создать аккаунт"}
        </Text>
      </AnimatedPressable>
      <Link href="/(auth)/login" className="mt-6 text-center text-muted">
        Уже есть аккаунт? Войти
      </Link>
    </View>
  );
}
