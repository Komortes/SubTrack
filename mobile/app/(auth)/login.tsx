import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const enableOfflineMode = useAuthStore((state) => state.useOfflineMode);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || password.length === 0) {
      setLocalError("Укажи email и пароль.");
      return;
    }

    try {
      await login(normalizedEmail, password);
      router.replace("/(app)/(tabs)");
    } catch {
      // Error text is rendered from authStore.
    }
  }

  async function continueOffline() {
    await enableOfflineMode();
    router.replace("/(app)/(tabs)");
  }

  function updateEmail(value: string) {
    setEmail(value);
    setLocalError(null);
    clearError();
  }

  function updatePassword(value: string) {
    setPassword(value);
    setLocalError(null);
    clearError();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-bg px-6"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text className="text-3xl font-bold tracking-tight text-ink">Вход</Text>
      <Text className="mt-2 text-base text-subtle">Синхронизируй подписки между устройствами.</Text>
      <Text className="mt-8 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Email</Text>
      <TextInput
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
        placeholder="name@example.com"
        placeholderTextColor="#525252"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={updateEmail}
      />
      <Text className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Пароль</Text>
      <View className="flex-row items-center rounded-2xl border border-border bg-surface pr-4">
        <TextInput
          className="flex-1 px-4 py-4 text-ink"
          placeholder="••••••••"
          placeholderTextColor="#525252"
          secureTextEntry={!showPassword}
          textContentType="password"
          value={password}
          onChangeText={updatePassword}
        />
        <Pressable hitSlop={8} onPress={() => setShowPassword((value) => !value)}>
          <Text className="text-sm font-semibold text-muted">{showPassword ? "Скрыть" : "Показать"}</Text>
        </Pressable>
      </View>
      {localError || error ? <Text className="mt-3 text-sm font-medium text-danger">{localError ?? error}</Text> : null}
      <AnimatedPressable className="mt-6 rounded-2xl bg-accent px-5 py-4" disabled={isLoading} onPress={submit}>
        <Text className="text-center font-semibold text-bg">{isLoading ? "Входим..." : "Войти"}</Text>
      </AnimatedPressable>
      <AnimatedPressable
        className="mt-3 rounded-2xl border border-border bg-surface px-5 py-4"
        disabled={isLoading}
        onPress={continueOffline}
      >
        <Text className="text-center font-semibold text-subtle">Продолжить офлайн</Text>
      </AnimatedPressable>
      <Link href="/(auth)/register" className="mt-6 text-center text-muted">
        Нет аккаунта? Зарегистрироваться
      </Link>
    </KeyboardAvoidingView>
  );
}
