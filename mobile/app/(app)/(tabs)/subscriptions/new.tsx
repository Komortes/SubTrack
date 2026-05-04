import { Stack, router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SubscriptionCategory } from "@/lib/types";
import { useSubscriptionStore } from "@/store/subscriptionStore";

const categories: Array<{ label: string; value: SubscriptionCategory }> = [
  { label: "Развлечения", value: "entertainment" },
  { label: "Работа", value: "work" },
  { label: "Облако", value: "cloud" },
  { label: "Здоровье", value: "health" },
  { label: "Другое", value: "other" }
];

export default function NewSubscriptionScreen() {
  const addSubscription = useSubscriptionStore((state) => state.addSubscription);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SubscriptionCategory>("entertainment");

  function save() {
    const trimmedName = name.trim();
    const parsedAmount = Number(amount.replace(",", "."));

    if (!trimmedName || Number.isNaN(parsedAmount)) {
      return;
    }

    addSubscription({
      id: `${trimmedName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: trimmedName,
      amount: parsedAmount,
      currency: "CZK",
      billingPeriod: "monthly",
      renewalDate: new Date().toISOString().slice(0, 10),
      category,
      color: "#0F766E",
      isActive: true,
      createdAt: new Date().toISOString()
    });
    router.back();
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Добавить" }} />
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 px-5 py-6">
        <TextInput
          className="rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="Название"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          className="rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="Сумма, CZK"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View>
          <Text className="mb-3 text-sm font-semibold text-ink">Категория</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((item) => (
              <Pressable
                key={item.value}
                className={`rounded-full px-4 py-2 ${category === item.value ? "bg-ink" : "bg-white"}`}
                onPress={() => setCategory(item.value)}
              >
                <Text className={category === item.value ? "font-semibold text-white" : "font-semibold text-ink"}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Pressable className="mt-4 rounded-2xl bg-accent px-5 py-4" onPress={save}>
          <Text className="text-center font-semibold text-white">Сохранить</Text>
        </Pressable>
      </ScrollView>
    </>
  );
}

