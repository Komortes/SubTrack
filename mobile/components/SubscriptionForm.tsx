import { Feather } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { AnimatedPressable } from "@/components/AnimatedPressable";
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
    <ScrollView className="flex-1 bg-bg" contentContainerClassName="gap-5 px-5 py-6">
      <View>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Популярные сервисы</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {serviceSuggestions.map((suggestion) => (
              <AnimatedPressable
                key={suggestion.name}
                className="flex-row items-center gap-2 rounded-full border border-border bg-surface px-4 py-2"
                onPress={() => applySuggestion(suggestion)}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: suggestion.color }} />
                <Text className="font-semibold text-subtle">{suggestion.name}</Text>
              </AnimatedPressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Название подписки</Text>
        <TextInput
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
          placeholder="e.g. Netflix Premium"
          placeholderTextColor="#525252"
          value={name}
          onChangeText={setName}
        />
      </View>

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Сумма</Text>
        <TextInput
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
          placeholder="0.00"
          placeholderTextColor="#525252"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <View className="mt-2 flex-row rounded-2xl border border-border bg-surface p-1">
          {currencies.map((item) => (
            <AnimatedPressable
              key={item}
              className={`flex-1 items-center justify-center rounded-xl py-2.5 ${currency === item ? "bg-ink" : ""}`}
              onPress={() => setCurrency(item)}
            >
              <Text className={currency === item ? "text-xs font-semibold text-bg" : "text-xs font-semibold text-muted"}>
                {item}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Период</Text>
        <View className="flex-row flex-wrap gap-2">
          {billingPeriods.map((item) => (
            <AnimatedPressable
              key={item.value}
              className={`rounded-full border px-4 py-2 ${billingPeriod === item.value ? "border-ink bg-ink" : "border-border bg-surface"}`}
              onPress={() => setBillingPeriod(item.value)}
            >
              <Text className={billingPeriod === item.value ? "font-semibold text-bg" : "font-semibold text-muted"}>
                {item.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {billingPeriod === "custom" ? (
        <TextInput
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
          placeholder="Каждые X дней"
          placeholderTextColor="#525252"
          keyboardType="number-pad"
          value={customPeriodDays}
          onChangeText={setCustomPeriodDays}
        />
      ) : null}

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Дата списания</Text>
        <TextInput
          className="rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
          placeholder="дд.мм.гггг"
          placeholderTextColor="#525252"
          value={renewalDate}
          onChangeText={setRenewalDate}
        />
      </View>

      <View>
        <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">Категория</Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((item) => {
            type FeatherIcon = keyof typeof Feather.glyphMap;
            const iconName: FeatherIcon =
              item.value === "entertainment" ? "tv"
              : item.value === "work" ? "briefcase"
              : item.value === "cloud" ? "cloud"
              : item.value === "health" ? "heart"
              : "more-horizontal";
            const selected = category === item.value;
            return (
              <AnimatedPressable
                key={item.value}
                className={`flex-row items-center gap-1.5 rounded-full border px-4 py-2 ${selected ? "border-ink bg-ink" : "border-border bg-surface"}`}
                onPress={() => setCategory(item.value)}
              >
                <Feather name={iconName} size={13} color={selected ? "#0a0a0a" : "#525252"} />
                <Text className={selected ? "font-semibold text-bg" : "font-semibold text-muted"}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      </View>

      <View>
        <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Заметки</Text>
        <TextInput
          className="min-h-28 rounded-2xl border border-border bg-surface px-4 py-4 text-ink"
          placeholder="Shared with the family..."
          placeholderTextColor="#525252"
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      <AnimatedPressable className="rounded-2xl bg-accent px-5 py-4" onPress={submit}>
        <Text className="text-center font-semibold text-bg">{submitLabel}</Text>
      </AnimatedPressable>
    </ScrollView>
  );
}
