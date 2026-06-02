import { Feather } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onDone: () => void;
};

export function SocialAuthButtons({ onDone }: Props) {
  const { t } = useTranslation();
  const clientId = getPlatformClientId();

  if (!clientId) {
    return (
      <View className="mt-4 gap-3">
        <AnimatedPressable
          className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4"
          onPress={() => Alert.alert("Google Sign In", t("auth.social.continueWithGoogle"))}
        >
          <Feather name="chrome" size={17} color="#a3a3a3" />
          <Text className="text-center font-semibold text-muted">{t("auth.social.continueWithGoogle")}</Text>
        </AnimatedPressable>
      </View>
    );
  }

  return <GoogleAuthButton onDone={onDone} />;
}

function GoogleAuthButton({ onDone }: Props) {
  const { t } = useTranslation();
  const socialLogin = useAuthStore((state) => state.socialLogin);
  const isLoading = useAuthStore((state) => state.isLoading);
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    scopes: ["openid", "profile", "email"],
    selectAccount: true
  });

  useEffect(() => {
    const idToken = googleResponse?.type === "success" ? googleResponse.params.id_token : null;
    if (!idToken) return;

    socialLogin("google", idToken)
      .then(onDone)
      .catch(() => undefined);
  }, [googleResponse, onDone, socialLogin]);

  async function signInWithGoogle() {
    await promptGoogle();
  }

  return (
    <View className="mt-4 gap-3">
      <AnimatedPressable
        className="flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-5 py-4"
        disabled={!googleRequest || isLoading}
        onPress={signInWithGoogle}
      >
        <Feather name="chrome" size={17} color="#a3a3a3" />
        <Text className="text-center font-semibold text-ink">{t("auth.social.continueWithGoogle")}</Text>
      </AnimatedPressable>
    </View>
  );
}

function getPlatformClientId(): string | undefined {
  if (Platform.OS === "ios") return process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  if (Platform.OS === "android") return process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
  return process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
}
