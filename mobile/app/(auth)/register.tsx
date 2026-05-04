import { Link, router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";

export default function RegisterScreen() {
  return (
    <View className="flex-1 justify-center bg-white px-6">
      <Text className="text-3xl font-bold text-ink">Регистрация</Text>
      <Text className="mt-2 text-base text-muted">Аккаунт нужен только для синхронизации.</Text>
      <TextInput className="mt-8 rounded-2xl border border-line px-4 py-4" placeholder="Email" autoCapitalize="none" />
      <TextInput className="mt-3 rounded-2xl border border-line px-4 py-4" placeholder="Пароль" secureTextEntry />
      <Pressable className="mt-5 rounded-2xl bg-ink px-5 py-4" onPress={() => router.replace("/(app)/(tabs)")}>
        <Text className="text-center font-semibold text-white">Создать аккаунт</Text>
      </Pressable>
      <Link href="/(auth)/login" className="mt-6 text-center text-muted">
        Уже есть аккаунт? Войти
      </Link>
    </View>
  );
}

