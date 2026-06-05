import { Feather } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { AuthDivider, AuthField, AuthHeader, AuthValueStrip } from "@/components/AuthSurface";
import { SocialAuthButtons } from "@/components/SocialAuthButtons";
import { useIsDark } from "@/hooks/useIsDark";
import { useAuthStore } from "@/store/authStore";

export default function LoginScreen() {
  const { t } = useTranslation();
  const enableOfflineMode = useAuthStore((state) => state.useOfflineMode);
  const login = useAuthStore((state) => state.login);
  const isLoading = useAuthStore((state) => state.isLoading);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isLoadingOffline, setIsLoadingOffline] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const isDark = useIsDark();
  const primaryIconColor = isDark ? "#0a0a0a" : "#fafafa";

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || password.length === 0) {
      setLocalError(t("auth.login.validationError"));
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
    setIsLoadingOffline(true);
    try {
      await enableOfflineMode();
      router.replace("/(app)/(tabs)");
    } finally {
      setIsLoadingOffline(false);
    }
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
      className="flex-1 bg-bg"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          eyebrow="SubTrack"
          title={t("auth.login.title")}
          subtitle={t("auth.login.subtitle")}
        />
        <AuthValueStrip />

        <AuthField
          icon="mail"
          label={t("auth.login.email")}
          placeholder="name@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={updateEmail}
          onSubmitEditing={() => passwordRef.current?.focus()}
          invalid={!!localError && !email.trim().includes("@")}
        />

        <AuthField
          icon="lock"
          label={t("auth.login.password")}
          inputRef={passwordRef}
          placeholder={t("auth.login.password")}
          secureTextEntry={!showPassword}
          textContentType="password"
          returnKeyType="done"
          value={password}
          onChangeText={updatePassword}
          onSubmitEditing={submit}
          invalid={!!localError && password.length === 0}
          right={
          <Pressable hitSlop={12} onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#a3a3a3" />
          </Pressable>
          }
        />

        {localError || error ? (
          <View className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
            <Text className="text-sm font-medium text-danger">{localError ?? error}</Text>
          </View>
        ) : null}

        <AnimatedPressable
          className="mt-7 flex-row items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-4"
          disabled={isLoading}
          onPress={submit}
        >
          <Feather name="log-in" size={17} color={primaryIconColor} />
          <Text className="text-center font-semibold text-bg">{t("auth.login.signIn")}</Text>
        </AnimatedPressable>

        <AnimatedPressable
          className="mt-3 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4"
          disabled={isLoading || isLoadingOffline}
          onPress={continueOffline}
        >
          <Feather name="hard-drive" size={17} color="#a3a3a3" />
          <Text className="text-center font-semibold text-subtle">
            {isLoadingOffline ? "…" : t("auth.login.continueOffline")}
          </Text>
        </AnimatedPressable>

        <AuthDivider />
        <SocialAuthButtons onDone={() => router.replace("/(app)/(tabs)")} />

        <View className="mt-7 flex-row justify-center gap-1">
          <Text className="text-muted">{t("auth.login.noAccount")}</Text>
          <Link href="/(auth)/register" className="font-semibold text-ink">
            {t("auth.login.register")}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
