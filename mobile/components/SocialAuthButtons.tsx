import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Alert, Text, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { useAuthStore } from "@/store/authStore";

WebBrowser.maybeCompleteAuthSession();

type Props = {
  onDone: () => void;
};

export function SocialAuthButtons({ onDone }: Props) {
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
    if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID && !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) {
      Alert.alert("Google Sign In не настроен", "Добавь Google Client ID в mobile/.env.");
      return;
    }

    await promptGoogle();
  }

  return (
    <View className="mt-4 gap-3">
      <AnimatedPressable
        className="rounded-2xl border border-border bg-surface px-5 py-4"
        disabled={!googleRequest || isLoading}
        onPress={signInWithGoogle}
      >
        <Text className="text-center font-semibold text-ink">Войти через Google</Text>
      </AnimatedPressable>
    </View>
  );
}
