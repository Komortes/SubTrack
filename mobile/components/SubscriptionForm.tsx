import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { billingPeriods, categories, currencies, serviceSuggestions } from "@/lib/catalog";
import { BillingPeriod, Subscription, SubscriptionCategory } from "@/lib/types";

type FormValue = Omit<Subscription, "id" | "createdAt" | "isActive">;

type Props = {
  initialValue?: Subscription;
  submitLabel: string;
  onSubmit: (value: FormValue) => void;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function SubscriptionForm({ initialValue, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initialValue?.name ?? "");
  const [amount, setAmount] = useState(initialValue ? String(Number(initialValue.amount)) : "");
  const [currency, setCurrency] = useState<FormValue["currency"]>(initialValue?.currency ?? "CZK");
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialValue?.billingPeriod ?? "monthly");
  const [customPeriodDays, setCustomPeriodDays] = useState(
    initialValue?.customPeriodDays ? String(initialValue.customPeriodDays) : "30"
  );
  const [renewalDate, setRenewalDate] = useState(initialValue?.renewalDate ?? today());
  const [category, setCategory] = useState<SubscriptionCategory>(initialValue?.category ?? "entertainment");
  const [iconSlug, setIconSlug] = useState(initialValue?.iconSlug ?? "");
  const [color, setColor] = useState(initialValue?.color ?? "#0F766E");
  const [notes, setNotes] = useState(initialValue?.notes ?? "");

  function applySuggestion(suggestion: (typeof serviceSuggestions)[number]) {
    setName(suggestion.name);
    setIconSlug(suggestion.iconSlug);
    setColor(suggestion.color);
    setCategory(suggestion.category);
  }

  function submit() {
    const trimmedName = name.trim();
    const parsedAmount = Number(amount.replace(",", "."));
    const parsedCustomDays = Number(customPeriodDays);

    if (!trimmedName || Number.isNaN(parsedAmount)) {
      return;
    }

    onSubmit({
      name: trimmedName,
      amount: parsedAmount,
      currency,
      billingPeriod,
      customPeriodDays: billingPeriod === "custom" && parsedCustomDays > 0 ? parsedCustomDays : undefined,
      renewalDate,
      category,
      iconSlug: iconSlug || undefined,
      color,
      notes: notes.trim() || undefined
    });
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-5 px-5 py-6">
      <View>
        <Text className="mb-3 text-sm font-semibold text-ink">Популярные сервисы</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {serviceSuggestions.map((suggestion) => (
              <Pressable
                key={suggestion.name}
                className="rounded-full bg-white px-4 py-2"
                onPress={() => applySuggestion(suggestion)}
              >
                <Text className="font-semibold text-ink">{suggestion.name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <TextInput
        className="rounded-2xl border border-line bg-white px-4 py-4"
        placeholder="Название"
        value={name}
        onChangeText={setName}
      />

      <View className="flex-row gap-3">
        <TextInput
          className="flex-1 rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="Сумма"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View className="w-32 flex-row rounded-2xl bg-white p-1">
          {currencies.map((item) => (
            <Pressable
              key={item}
              className={`flex-1 items-center justify-center rounded-xl ${currency === item ? "bg-ink" : ""}`}
              onPress={() => setCurrency(item)}
            >
              <Text className={currency === item ? "text-xs font-semibold text-white" : "text-xs font-semibold text-muted"}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-3 text-sm font-semibold text-ink">Период</Text>
        <View className="flex-row flex-wrap gap-2">
          {billingPeriods.map((item) => (
            <Pressable
              key={item.value}
              className={`rounded-full px-4 py-2 ${billingPeriod === item.value ? "bg-ink" : "bg-white"}`}
              onPress={() => setBillingPeriod(item.value)}
            >
              <Text className={billingPeriod === item.value ? "font-semibold text-white" : "font-semibold text-ink"}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {billingPeriod === "custom" ? (
        <TextInput
          className="rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="Каждые X дней"
          keyboardType="number-pad"
          value={customPeriodDays}
          onChangeText={setCustomPeriodDays}
        />
      ) : null}

      <TextInput
        className="rounded-2xl border border-line bg-white px-4 py-4"
        placeholder="Дата списания YYYY-MM-DD"
        value={renewalDate}
        onChangeText={setRenewalDate}
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

      <View className="flex-row gap-3">
        <TextInput
          className="flex-1 rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="Icon slug"
          value={iconSlug}
          onChangeText={setIconSlug}
        />
        <TextInput
          className="w-32 rounded-2xl border border-line bg-white px-4 py-4"
          placeholder="#0F766E"
          value={color}
          onChangeText={setColor}
        />
      </View>

      <TextInput
        className="min-h-28 rounded-2xl border border-line bg-white px-4 py-4"
        placeholder="Заметки"
        multiline
        textAlignVertical="top"
        value={notes}
        onChangeText={setNotes}
      />

      <Pressable className="rounded-2xl bg-accent px-5 py-4" onPress={submit}>
        <Text className="text-center font-semibold text-white">{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}
