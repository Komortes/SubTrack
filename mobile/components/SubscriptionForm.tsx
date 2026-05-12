import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { billingPeriods, categories, currencies, iconColors, serviceIconOptions, serviceSuggestions } from "@/lib/catalog";
import { formatDate, toLocalIsoDate } from "@/lib/dateFormat";
import { BillingPeriod, Subscription, SubscriptionCategory } from "@/lib/types";
import { ServiceIcon } from "./ServiceIcon";
import { useSettingsStore } from "@/store/settingsStore";

type FormValue = Omit<Subscription, "id" | "createdAt" | "isActive">;

type Props = {
  initialValue?: Subscription;
  submitLabel: string;
  onSubmit: (value: FormValue) => Promise<void> | void;
};

function today(): string {
  return toLocalIsoDate(new Date());
}

function toDate(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function toIsoDate(value: Date): string {
  return toLocalIsoDate(value);
}

function addDays(value: string, days: number): string {
  const date = toDate(value);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function addMonths(value: string, months: number): string {
  const date = toDate(value);
  date.setMonth(date.getMonth() + months);
  return toIsoDate(date);
}

const monthNames = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь"
];

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <View className="rounded-3xl border border-border bg-surface p-4">
      <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ children, first }: { children: React.ReactNode; first?: boolean }) {
  return (
    <Text className={`${first ? "" : "mt-4"} mb-2 text-xs font-semibold uppercase tracking-widest text-muted`}>
      {children}
    </Text>
  );
}

function DateSelector({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const dateFormat = useSettingsStore((state) => state.dateFormat);
  const selectedDate = toDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  const days = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const firstWeekday = (firstDay.getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: totalDays }, (_, index) => new Date(year, month, index + 1))
    ];
  }, [visibleMonth]);

  function moveMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function selectQuick(nextValue: string) {
    onChange(nextValue);
    const date = toDate(nextValue);
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  return (
    <View className="rounded-3xl border border-border bg-bg p-3">
      <View className="flex-row items-center justify-between">
        <AnimatedPressable
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          hitSlop={8}
          onPress={() => moveMonth(-1)}
        >
          <Feather name="chevron-left" size={18} color="#fafafa" />
        </AnimatedPressable>
        <View className="flex-1 items-center px-3">
          <Text className="text-base font-semibold text-ink">
            {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">Выбрано: {formatDate(value, dateFormat)}</Text>
        </View>
        <AnimatedPressable
          className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface"
          hitSlop={8}
          onPress={() => moveMonth(1)}
        >
          <Feather name="chevron-right" size={18} color="#fafafa" />
        </AnimatedPressable>
      </View>

      <View className="mt-4 flex-row gap-2">
        {[
          ["Сегодня", today()],
          ["+7 дней", addDays(today(), 7)],
          ["+1 месяц", addMonths(today(), 1)]
        ].map(([label, nextValue]) => (
          <AnimatedPressable
            key={label}
            className={`min-h-11 flex-1 items-center justify-center rounded-full border px-3 ${value === nextValue ? "border-ink bg-ink" : "border-border bg-surface"}`}
            hitSlop={4}
            onPress={() => selectQuick(nextValue)}
          >
            <Text className={`text-center text-xs font-semibold ${value === nextValue ? "text-bg" : "text-subtle"}`}>{label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View className="mt-4 flex-row">
        {weekDays.map((day) => (
          <Text key={day} className="flex-1 text-center text-xs font-semibold uppercase text-muted">
            {day}
          </Text>
        ))}
      </View>

      <View className="mt-2 flex-row flex-wrap">
        {days.map((day, index) => {
          const iso = day ? toIsoDate(day) : "";
          const selected = iso === value;
          const isToday = iso === today();
          return (
            <View key={`${iso}-${index}`} style={{ width: `${100 / 7}%`, padding: 3 }}>
              {day ? (
                <AnimatedPressable
                  className={`h-11 items-center justify-center rounded-full ${
                    selected ? "bg-ink" : isToday ? "border border-border bg-bg" : "bg-transparent"
                  }`}
                  hitSlop={3}
                  onPress={() => onChange(iso)}
                >
                  <Text className={`text-sm font-semibold ${selected ? "text-bg" : "text-ink"}`}>
                    {day.getDate()}
                  </Text>
                </AnimatedPressable>
              ) : (
                <View className="h-11" />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function SubscriptionForm({ initialValue, submitLabel, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const primaryCurrency = useSettingsStore((state) => state.primaryCurrency);
  const [name, setName] = useState(initialValue?.name ?? "");
  const [amount, setAmount] = useState(initialValue ? String(Number(initialValue.amount)) : "");
  const [currency, setCurrency] = useState<FormValue["currency"]>(initialValue?.currency ?? primaryCurrency);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(initialValue?.billingPeriod ?? "monthly");
  const [customPeriodDays, setCustomPeriodDays] = useState(
    initialValue?.customPeriodDays ? String(initialValue.customPeriodDays) : "30"
  );
  const [renewalDate, setRenewalDate] = useState(initialValue?.renewalDate ?? today());
  const [category, setCategory] = useState<SubscriptionCategory>(initialValue?.category ?? "entertainment");
  const [iconSlug, setIconSlug] = useState(initialValue?.iconSlug ?? "");
  const [color, setColor] = useState(initialValue?.color ?? "#0F766E");
  const [notes, setNotes] = useState(initialValue?.notes ?? "");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function applySuggestion(suggestion: (typeof serviceSuggestions)[number]) {
    setName(suggestion.name);
    setIconSlug(suggestion.iconSlug);
    setColor(suggestion.color);
    setCategory(suggestion.category);
  }

  async function submit() {
    if (isSubmitting) return;

    const trimmedName = name.trim();
    const parsedAmount = Number(amount.replace(",", "."));
    const parsedCustomDays = Number(customPeriodDays);

    if (!trimmedName) {
      setFormError("Добавь название подписки.");
      return;
    }

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Укажи сумму больше нуля.");
      return;
    }

    if (billingPeriod === "custom" && (Number.isNaN(parsedCustomDays) || parsedCustomDays <= 0)) {
      setFormError("Для кастомного периода укажи интервал в днях.");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await onSubmit({
        name: trimmedName,
        amount: parsedAmount,
        currency,
        billingPeriod,
        customPeriodDays: billingPeriod === "custom" ? parsedCustomDays : undefined,
        renewalDate,
        category,
        iconSlug: iconSlug || undefined,
        color,
        notes: notes.trim() || undefined
      });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Не удалось сохранить подписку.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-bg" behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        className="flex-1 bg-bg"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        contentContainerClassName="gap-4 px-5 pt-5"
      >
      <View className="rounded-3xl border border-border bg-surface p-4">
        <Text className="text-xs font-semibold uppercase tracking-widest text-muted">
          {initialValue ? "Редактирование подписки" : "Новая подписка"}
        </Text>
        <View className="mt-3 flex-row items-center gap-3">
          <ServiceIcon name={name || "Подписка"} iconSlug={iconSlug || undefined} color={color} size={48} />
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink">{name.trim() || "Название сервиса"}</Text>
            <Text className="mt-0.5 text-sm text-muted">
              {amount || "0"} {currency} · {billingPeriods.find((item) => item.value === billingPeriod)?.label}
            </Text>
          </View>
        </View>
      </View>

      <Section title="Сервис">
        {!initialValue ? (
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            className="-mx-4 mb-4"
            contentContainerClassName="gap-2 px-4"
          >
            {serviceSuggestions.map((suggestion) => (
              <AnimatedPressable
                key={suggestion.name}
                className="min-h-11 flex-row items-center gap-2 rounded-full border border-border bg-bg px-4"
                hitSlop={4}
                onPress={() => applySuggestion(suggestion)}
              >
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: suggestion.color }} />
                <Text className="font-semibold text-subtle">{suggestion.name}</Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
        ) : null}

        <FieldLabel first>Название подписки</FieldLabel>
        <TextInput
          className={`rounded-2xl border bg-bg px-4 py-4 text-ink ${formError && !name.trim() ? "border-danger" : "border-border"}`}
          placeholder="e.g. Netflix Premium"
          placeholderTextColor="#525252"
          value={name}
          onChangeText={(value) => {
            setName(value);
            if (formError) setFormError(null);
          }}
        />

        <FieldLabel>Категория</FieldLabel>
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
                className={`min-h-11 flex-row items-center gap-1.5 rounded-full border px-4 ${selected ? "border-ink bg-ink" : "border-border bg-bg"}`}
                hitSlop={4}
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

        <FieldLabel>Иконка</FieldLabel>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          className="-mx-4"
          contentContainerClassName="gap-2 px-4"
        >
          {serviceIconOptions.map((item) => {
            const selected = iconSlug === item.slug;
            return (
              <AnimatedPressable
                key={item.label}
                className={`min-h-16 min-w-16 items-center justify-center rounded-2xl border px-3 ${
                  selected ? "border-ink bg-ink" : "border-border bg-bg"
                }`}
                onPress={() => setIconSlug(item.slug)}
              >
                <ServiceIcon name={name || item.label} iconSlug={item.slug || undefined} color={color} size={34} />
                <Text className={`mt-1 text-[10px] font-semibold ${selected ? "text-bg" : "text-muted"}`}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </ScrollView>

        <FieldLabel>Цвет</FieldLabel>
        <View className="flex-row flex-wrap gap-3">
          {iconColors.map((item) => {
            const selected = color.toLowerCase() === item.toLowerCase();
            return (
              <AnimatedPressable
                key={item}
                className={`h-11 w-11 items-center justify-center rounded-full border ${selected ? "border-ink" : "border-border"}`}
                onPress={() => setColor(item)}
              >
                <View className="h-8 w-8 rounded-full" style={{ backgroundColor: item }} />
              </AnimatedPressable>
            );
          })}
        </View>
      </Section>

      <Section title="Стоимость">
        <FieldLabel first>Сумма</FieldLabel>
        <TextInput
          className={`rounded-2xl border bg-bg px-4 py-4 text-ink ${formError && Number(amount.replace(",", ".")) <= 0 ? "border-danger" : "border-border"}`}
          placeholder="0.00"
          placeholderTextColor="#525252"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(value) => {
            setAmount(value);
            if (formError) setFormError(null);
          }}
        />
        <FieldLabel>Валюта</FieldLabel>
        <View className="flex-row rounded-2xl border border-border bg-bg p-1">
          {currencies.map((item) => (
            <AnimatedPressable
              key={item}
              className={`min-h-12 flex-1 items-center justify-center rounded-xl ${currency === item ? "bg-ink" : ""}`}
              hitSlop={4}
              onPress={() => setCurrency(item)}
            >
              <Text className={currency === item ? "text-sm font-semibold text-bg" : "text-sm font-semibold text-muted"}>
                {item}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
      </Section>

      <Section title="Расписание">
        <FieldLabel first>Период</FieldLabel>
        <View className="flex-row flex-wrap gap-2">
          {billingPeriods.map((item) => (
            <AnimatedPressable
              key={item.value}
              className={`min-h-11 rounded-full border px-4 ${billingPeriod === item.value ? "border-ink bg-ink" : "border-border bg-bg"}`}
              hitSlop={4}
              onPress={() => setBillingPeriod(item.value)}
            >
              <Text className={billingPeriod === item.value ? "font-semibold leading-10 text-bg" : "font-semibold leading-10 text-muted"}>
                {item.label}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        {billingPeriod === "custom" ? (
          <View className="mt-4">
            <FieldLabel>Интервал</FieldLabel>
            <TextInput
              className={`rounded-2xl border bg-bg px-4 py-4 text-ink ${formError && billingPeriod === "custom" && Number(customPeriodDays) <= 0 ? "border-danger" : "border-border"}`}
              placeholder="Каждые X дней"
              placeholderTextColor="#525252"
              keyboardType="number-pad"
              value={customPeriodDays}
              onChangeText={(value) => {
                setCustomPeriodDays(value);
                if (formError) setFormError(null);
              }}
            />
          </View>
        ) : null}

        <View className="mt-4">
          <FieldLabel>Дата списания</FieldLabel>
          <DateSelector value={renewalDate} onChange={setRenewalDate} />
        </View>
      </Section>

      <Section title="Дополнительно">
        <FieldLabel first>Заметки</FieldLabel>
        <TextInput
          className="min-h-28 rounded-2xl border border-border bg-bg px-4 py-4 text-ink"
          placeholder="Shared with the family..."
          placeholderTextColor="#525252"
          multiline
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />
      </Section>
      </ScrollView>

      <View
        className="absolute left-0 right-0 border-t border-border bg-bg/95 px-5 pt-3"
        style={{ bottom: 0, paddingBottom: insets.bottom + 12 }}
      >
        {formError ? <Text className="mb-2 text-center text-sm font-medium text-danger">{formError}</Text> : null}
        <AnimatedPressable
          className={`rounded-2xl px-5 py-4 ${isSubmitting ? "bg-border" : "bg-accent"}`}
          disabled={isSubmitting}
          onPress={submit}
        >
          <Text className="text-center font-semibold text-bg">
            {isSubmitting ? "Сохраняю..." : submitLabel}
          </Text>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}
