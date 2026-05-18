import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
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
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

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

  function updateField(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setLocalError(null);
      clearError();
    };
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-3xl font-bold tracking-tight text-ink">Регистрация</Text>
        <Text className="mt-2 text-base text-subtle">Аккаунт нужен только для синхронизации.</Text>

        <Text className="mt-8 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Email</Text>
        <TextInput
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-base text-ink"
          placeholder="name@example.com"
          placeholderTextColor="#525252"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={updateField(setEmail)}
          onSubmitEditing={() => passwordRef.current?.focus()}
        />

        <Text className="mt-5 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Пароль</Text>
        <View className="flex-row items-center rounded-2xl border border-border bg-surface pr-4">
          <TextInput
            ref={passwordRef}
            className="flex-1 px-4 py-4 text-base text-ink"
            placeholder="••••••••"
            placeholderTextColor="#525252"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            returnKeyType="next"
            value={password}
            onChangeText={updateField(setPassword)}
            onSubmitEditing={() => confirmRef.current?.focus()}
          />
          <Pressable hitSlop={12} onPress={() => setShowPassword((v) => !v)}>
            <Text className="text-sm font-semibold text-muted">{showPassword ? "Скрыть" : "Показать"}</Text>
          </Pressable>
        </View>

        <Text className="mt-5 mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Повтор пароля</Text>
        <TextInput
          ref={confirmRef}
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-base text-ink"
          placeholder="••••••••"
          placeholderTextColor="#525252"
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          returnKeyType="done"
          value={passwordConfirmation}
          onChangeText={updateField(setPasswordConfirmation)}
          onSubmitEditing={submit}
        />

        {localError || error ? (
          <Text className="mt-3 text-sm font-medium text-danger">{localError ?? error}</Text>
        ) : null}

        <AnimatedPressable
          className="mt-7 rounded-2xl bg-accent px-5 py-4"
          disabled={isLoading}
          onPress={submit}
        >
          <Text className="text-center font-semibold text-bg">
            {isLoading ? "Создаем..." : "Создать аккаунт"}
          </Text>
        </AnimatedPressable>

        <SocialAuthButtons onDone={() => router.replace("/(app)/(tabs)")} />

        <Link href="/(auth)/login" className="mt-6 text-center text-muted">
          Уже есть аккаунт? Войти
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
