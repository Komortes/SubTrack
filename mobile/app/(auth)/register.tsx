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

export default function RegisterScreen() {
  const { t } = useTranslation();
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
  const isDark = useIsDark();
  const primaryIconColor = isDark ? "#0a0a0a" : "#fafafa";

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail.includes("@") || password.length < 6) {
      setLocalError(t("auth.register.validationError"));
      return;
    }
    if (password !== passwordConfirmation) {
      setLocalError(t("auth.register.validationError"));
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
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          eyebrow="SubTrack"
          title={t("auth.register.title")}
          subtitle={t("auth.register.subtitle")}
        />
        <AuthValueStrip />

        <View className="mt-8">
          <Text className="text-sm font-semibold text-muted">{t("auth.register.email")}</Text>
        </View>

        <AuthField
          icon="mail"
          label={t("auth.register.email")}
          placeholder="name@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
          value={email}
          onChangeText={updateField(setEmail)}
          onSubmitEditing={() => passwordRef.current?.focus()}
          invalid={!!localError && !email.trim().includes("@")}
        />

        <AuthField
          icon="lock"
          label={t("auth.register.password")}
          inputRef={passwordRef}
          placeholder={t("auth.register.password")}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          returnKeyType="next"
          value={password}
          onChangeText={updateField(setPassword)}
          onSubmitEditing={() => confirmRef.current?.focus()}
          invalid={!!localError && password.length < 6}
          right={
          <Pressable hitSlop={12} onPress={() => setShowPassword((v) => !v)}>
              <Feather name={showPassword ? "eye-off" : "eye"} size={18} color="#a3a3a3" />
          </Pressable>
          }
        />

        <AuthField
          icon="check-circle"
          label={t("auth.register.password")}
          inputRef={confirmRef}
          placeholder={t("auth.register.password")}
          secureTextEntry={!showPassword}
          textContentType="newPassword"
          returnKeyType="done"
          value={passwordConfirmation}
          onChangeText={updateField(setPasswordConfirmation)}
          onSubmitEditing={submit}
          invalid={!!localError && passwordConfirmation.length > 0 && password !== passwordConfirmation}
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
          <Feather name="user-plus" size={17} color={primaryIconColor} />
          <Text className="text-center font-semibold text-bg">
            {t("auth.register.createAccount")}
          </Text>
        </AnimatedPressable>

        <AuthDivider />
        <SocialAuthButtons onDone={() => router.replace("/(app)/(tabs)")} />

        <View className="mt-7 flex-row justify-center gap-1">
          <Text className="text-muted">{t("auth.register.haveAccount")}</Text>
          <Link href="/(auth)/login" className="font-semibold text-ink">
            {t("auth.register.signIn")}
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
