import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@")) {
      setLocalError("Укажи корректный email.");
      return;
    }

    if (password.length < 8) {
      setLocalError("Пароль должен быть минимум 8 символов.");
      return;
    }

    if (password !== passwordConfirmation) {
      setLocalError("Пароли не совпадают.");
      return;
    }

    try {
      await register(normalizedEmail, password);
      router.replace("/(app)/(tabs)");
    } catch {
      // Error text is rendered from authStore.
    }
  }

  function updateField(setter: (value: string) => void) {
    return (value: string) => {
      setter(value);
      setLocalError(null);
      clearError();
    };
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 justify-center bg-bg px-6"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text className="text-3xl font-bold tracking-tight text-ink">Регистрация</Text>
      <Text className="mt-2 text-base text-subtle">Аккаунт нужен только для синхронизации.</Text>
      <Text className="mt-8 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Email</Text>
      <TextInput
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
        placeholder="name@example.com"
        placeholderTextColor="#525252"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={updateField(setEmail)}
      />
      <Text className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Пароль</Text>
      <View className="flex-row items-center rounded-2xl border border-border bg-surface pr-4">
        <TextInput
          className="flex-1 px-4 py-4 text-ink"
          placeholder="••••••••"
          placeholderTextColor="#525252"
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          value={password}
          onChangeText={updateField(setPassword)}
        />
        <Pressable hitSlop={8} onPress={() => setShowPassword((v) => !v)}>
          <Text className="text-sm font-semibold text-muted">{showPassword ? "Скрыть" : "Показать"}</Text>
        </Pressable>
      </View>
      <Text className="mt-4 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Повтор пароля</Text>
      <TextInput
        className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
        placeholder="••••••••"
        placeholderTextColor="#525252"
        secureTextEntry={!showPassword}
        textContentType="newPassword"
        value={passwordConfirmation}
        onChangeText={updateField(setPasswordConfirmation)}
      />
      {localError || error ? <Text className="mt-3 text-sm font-medium text-danger">{localError ?? error}</Text> : null}
      <AnimatedPressable className="mt-6 rounded-2xl bg-accent px-5 py-4" disabled={isLoading} onPress={submit}>
        <Text className="text-center font-semibold text-bg">
          {isLoading ? "Создаем..." : "Создать аккаунт"}
        </Text>
      </AnimatedPressable>
      <Link href="/(auth)/login" className="mt-6 text-center text-muted">
        Уже есть аккаунт? Войти
      </Link>
    </KeyboardAvoidingView>
  );
}
