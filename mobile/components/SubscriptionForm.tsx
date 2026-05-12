import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { haptic } from "@/lib/haptics";
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
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
];
const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

function Label({ children, top }: { children: React.ReactNode; top?: boolean }) {
  return (
    <Text className={`${top ? "" : "mt-5"} mb-2.5 text-sm font-semibold text-muted`}>
      {children}
    </Text>
  );
}

function DateSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
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
      ...Array.from({ length: totalDays }, (_, i) => new Date(year, month, i + 1))
    ];
  }, [visibleMonth]);

  function moveMonth(delta: number) {
    setVisibleMonth((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1));
  }

  function selectQuick(next: string) {
    onChange(next);
    const d = toDate(next);
    setVisibleMonth(new Date(d.getFullYear(), d.getMonth(), 1));
  }

  return (
    <View className="rounded-2xl border border-border bg-bg p-4">
      <View className="flex-row items-center justify-between">
        <AnimatedPressable
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
          hitSlop={8}
          onPress={() => moveMonth(-1)}
        >
          <Feather name="chevron-left" size={17} color="#fafafa" />
        </AnimatedPressable>
        <View className="flex-1 items-center px-3">
          <Text className="text-base font-semibold text-ink">
            {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">Выбрано: {formatDate(value, dateFormat)}</Text>
        </View>
        <AnimatedPressable
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
          hitSlop={8}
          onPress={() => moveMonth(1)}
        >
          <Feather name="chevron-right" size={17} color="#fafafa" />
        </AnimatedPressable>
      </View>

      <View className="mt-4 flex-row gap-2">
        {([["Сегодня", today()], ["+7 дней", addDays(today(), 7)], ["+1 месяц", addMonths(today(), 1)]] as [string, string][]).map(([label, next]) => (
          <AnimatedPressable
            key={label}
            className={`h-10 flex-1 items-center justify-center rounded-full border px-2 ${value === next ? "border-ink bg-ink" : "border-border bg-surface"}`}
            hitSlop={4}
            onPress={() => selectQuick(next)}
          >
            <Text className={`text-center text-xs font-semibold ${value === next ? "text-bg" : "text-subtle"}`}>{label}</Text>
          </AnimatedPressable>
        ))}
      </View>

      <View className="mt-4 flex-row">
        {weekDays.map((day) => (
          <Text key={day} className="flex-1 text-center text-xs font-semibold text-muted">
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
            <View key={`${iso}-${index}`} style={{ width: `${100 / 7}%`, padding: 2 }}>
              {day ? (
                <AnimatedPressable
                  className={`h-10 items-center justify-center rounded-full ${
                    selected ? "bg-ink" : isToday ? "border border-border bg-surface" : "bg-transparent"
                  }`}
                  hitSlop={2}
                  onPress={() => onChange(iso)}
                >
                  <Text className={`text-sm font-semibold ${selected ? "text-bg" : "text-ink"}`}>
                    {day.getDate()}
                  </Text>
                </AnimatedPressable>
              ) : (
                <View className="h-10" />
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
  const [iconsExpanded, setIconsExpanded] = useState(false);

  // Smart suggestions based on name input
  const nameSuggestions = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length < 1) return [];
    const lower = trimmed.toLowerCase();
    return serviceSuggestions.filter((s) => s.name.toLowerCase().startsWith(lower) && s.name.toLowerCase() !== lower);
  }, [name]);

  function applySuggestion(suggestion: (typeof serviceSuggestions)[number]) {
    setName(suggestion.name);
    setIconSlug(suggestion.iconSlug);
    setColor(suggestion.color);
    setCategory(suggestion.category as SubscriptionCategory);
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

    // Advance past renewal dates forward until future
    let effectiveRenewalDate = renewalDate;
    const todayStr = today();
    let safety = 0;
    while (effectiveRenewalDate < todayStr && safety < 366) {
      const d = toDate(effectiveRenewalDate);
      if (billingPeriod === "monthly") {
        d.setMonth(d.getMonth() + 1);
      } else if (billingPeriod === "yearly") {
        d.setFullYear(d.getFullYear() + 1);
      } else if (billingPeriod === "weekly") {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + (parsedCustomDays || 30));
      }
      effectiveRenewalDate = toIsoDate(d);
      safety++;
    }

    try {
      haptic.success();
      await onSubmit({
        name: trimmedName,
        amount: parsedAmount,
        currency,
        billingPeriod,
        customPeriodDays: billingPeriod === "custom" ? parsedCustomDays : undefined,
        renewalDate: effectiveRenewalDate,
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
        contentContainerClassName="gap-5 px-5 pt-5"
      >

        {/* Live preview */}
        <View className="flex-row items-center gap-4 rounded-2xl border border-border bg-surface p-5">
          <ServiceIcon name={name || "?"} iconSlug={iconSlug || undefined} color={color} size={56} />
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink" numberOfLines={1}>
              {name.trim() || "Название сервиса"}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {amount || "0"} {currency} · {billingPeriods.find((b) => b.value === billingPeriod)?.label ?? ""}
            </Text>
          </View>
        </View>

        {/* Section: Service */}
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Label top>Название</Label>
          <TextInput
            className={`rounded-xl border bg-bg px-4 py-4 text-base text-ink ${formError && !name.trim() ? "border-danger" : "border-border"}`}
            placeholder="Spotify, Netflix, iCloud..."
            placeholderTextColor="#525252"
            value={name}
            onChangeText={(v) => { setName(v); if (formError) setFormError(null); }}
            autoFocus={!initialValue}
          />

          {/* Smart suggestions */}
          {nameSuggestions.length > 0 ? (
            <View className="mt-2 flex-row flex-wrap gap-2">
              {nameSuggestions.map((s) => (
                <AnimatedPressable
                  key={s.name}
                  className="flex-row items-center gap-2 rounded-full border border-border bg-bg px-3 py-2"
                  onPress={() => applySuggestion(s)}
                >
                  <ServiceIcon name={s.name} iconSlug={s.iconSlug} color={s.color} size={20} />
                  <Text className="text-sm font-semibold text-subtle">{s.name}</Text>
                </AnimatedPressable>
              ))}
            </View>
          ) : null}

          <Label>Категория</Label>
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
                  className={`flex-row items-center gap-2 rounded-full border px-4 py-2.5 ${selected ? "border-ink bg-ink" : "border-border bg-bg"}`}
                  hitSlop={4}
                  onPress={() => setCategory(item.value)}
                >
                  <Feather name={iconName} size={13} color={selected ? "#0a0a0a" : "#525252"} />
                  <Text className={selected ? "text-sm font-semibold text-bg" : "text-sm font-semibold text-muted"}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <Label>Иконка</Label>
          <View className="flex-row flex-wrap gap-3">
            {(iconsExpanded ? serviceIconOptions : serviceIconOptions.slice(0, 8)).map((item) => {
              const selected = iconSlug === item.slug;
              return (
                <AnimatedPressable
                  key={item.label}
                  className={`items-center justify-center rounded-2xl border p-2 ${selected ? "border-ink bg-ink" : "border-border bg-bg"}`}
                  style={{ width: "22%", aspectRatio: 1 }}
                  onPress={() => setIconSlug(item.slug)}
                >
                  <ServiceIcon
                    name={name || item.label}
                    iconSlug={item.slug || undefined}
                    color={color}
                    size={34}
                  />
                  <Text className={`mt-1 text-[10px] font-semibold ${selected ? "text-bg" : "text-muted"}`} numberOfLines={1}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>
          {!iconsExpanded ? (
            <AnimatedPressable
              className="mt-3 items-center rounded-xl border border-border bg-bg py-2.5"
              onPress={() => setIconsExpanded(true)}
            >
              <Text className="text-xs font-semibold text-muted">
                Ещё {serviceIconOptions.length - 8} →
              </Text>
            </AnimatedPressable>
          ) : null}

          <Label>Цвет</Label>
          <View className="flex-row flex-wrap gap-3">
            {iconColors.map((item) => {
              const selected = color.toLowerCase() === item.toLowerCase();
              return (
                <AnimatedPressable
                  key={item}
                  className={`h-12 w-12 items-center justify-center rounded-full border ${selected ? "border-ink" : "border-transparent"}`}
                  onPress={() => setColor(item)}
                >
                  <View className="h-9 w-9 rounded-full" style={{ backgroundColor: item }} />
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        {/* Section: Cost */}
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Label top>Сумма</Label>
          <TextInput
            className={`rounded-xl border bg-bg px-4 py-4 text-2xl font-bold text-ink ${formError && Number(amount.replace(",", ".")) <= 0 ? "border-danger" : "border-border"}`}
            placeholder="0.00"
            placeholderTextColor="#525252"
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => { setAmount(v); if (formError) setFormError(null); }}
          />

          <Label>Валюта</Label>
          <View className="flex-row rounded-xl border border-border bg-bg p-1">
            {currencies.map((item) => (
              <AnimatedPressable
                key={item}
                className={`h-12 flex-1 items-center justify-center rounded-lg ${currency === item ? "bg-ink" : ""}`}
                hitSlop={4}
                onPress={() => setCurrency(item)}
              >
                <Text className={currency === item ? "font-semibold text-bg" : "font-semibold text-muted"}>
                  {item}
                </Text>
              </AnimatedPressable>
            ))}
          </View>
        </View>

        {/* Section: Schedule */}
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Label top>Период</Label>
          <View className="flex-row flex-wrap gap-2">
            {billingPeriods.map((item) => (
              <AnimatedPressable
                key={item.value}
                className={`rounded-full border px-5 py-2.5 ${billingPeriod === item.value ? "border-ink bg-ink" : "border-border bg-bg"}`}
                hitSlop={4}
                onPress={() => setBillingPeriod(item.value)}
              >
                <Text className={billingPeriod === item.value ? "font-semibold text-bg" : "font-semibold text-muted"}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          {billingPeriod === "custom" ? (
            <>
              <Label>Интервал (дней)</Label>
              <TextInput
                className={`rounded-xl border bg-bg px-4 py-4 text-base text-ink ${formError && Number(customPeriodDays) <= 0 ? "border-danger" : "border-border"}`}
                placeholder="Каждые X дней"
                placeholderTextColor="#525252"
                keyboardType="number-pad"
                value={customPeriodDays}
                onChangeText={(v) => { setCustomPeriodDays(v); if (formError) setFormError(null); }}
              />
            </>
          ) : null}

          <Label>Дата следующего списания</Label>
          <DateSelector value={renewalDate} onChange={setRenewalDate} />
          {renewalDate < today() ? (
            <View className="mt-2 flex-row items-center gap-2">
              <Feather name="info" size={13} color="#525252" />
              <Text className="flex-1 text-xs text-muted">
                Дата в прошлом — дата сохранится как следующая, уже вычисленная для будущего периода.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section: Extra */}
        <View className="rounded-2xl border border-border bg-surface p-5">
          <Label top>Заметки</Label>
          <TextInput
            className="min-h-24 rounded-xl border border-border bg-bg px-4 py-4 text-base text-ink"
            placeholder="Семейная подписка, рабочий аккаунт..."
            placeholderTextColor="#525252"
            multiline
            textAlignVertical="top"
            value={notes}
            onChangeText={setNotes}
          />
        </View>

      </ScrollView>

      {/* Submit bar */}
      <View
        className="absolute left-0 right-0 border-t border-border bg-bg/95 px-5 pt-3"
        style={{ bottom: 0, paddingBottom: insets.bottom + 12 }}
      >
        {formError ? (
          <Text className="mb-2 text-center text-sm font-medium text-danger">{formError}</Text>
        ) : null}
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
