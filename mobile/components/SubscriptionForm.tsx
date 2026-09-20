import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { AnimatedPressable } from "@/components/AnimatedPressable";
import { haptic } from "@/lib/haptics";
import { billingPeriods, categories, currencies, iconColors, serviceIconOptions, serviceSuggestions } from "@/lib/catalog";
import { formatDate, toLocalIsoDate } from "@/lib/dateFormat";
import { nextRenewalDate } from "@/lib/subscriptionMath";
import { useIsDark } from "@/hooks/useIsDark";
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
  let date = value;
  for (let index = 0; index < months; index += 1) {
    date = nextRenewalDate({ renewalDate: date, billingPeriod: "monthly" });
  }
  return date;
}

function Label({ children, top }: { children: React.ReactNode; top?: boolean }) {
  return (
    <Text className={`${top ? "" : "mt-5"} mb-2.5 text-sm font-semibold text-muted`}>
      {children}
    </Text>
  );
}

function FormStepHeader({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
}) {
  return (
    <View className="mb-4 flex-row items-center gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-bg">
        <Feather name={icon} size={17} color="#a3a3a3" />
      </View>
      <View className="flex-1">
        <Text className="text-base font-bold text-ink">{title}</Text>
        <Text className="mt-0.5 text-xs text-muted">{subtitle}</Text>
      </View>
    </View>
  );
}

function DateSelector({ value, onChange, minDate }: { value: string; onChange: (value: string) => void; minDate?: string }) {
  const { t, i18n } = useTranslation();
  const isDark = useIsDark();
  const iconColor = isDark ? "#fafafa" : "#0a0a0a";
  const dateFormat = useSettingsStore((state) => state.dateFormat);
  const selectedDate = toDate(value);
  const [visibleMonth, setVisibleMonth] = useState(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  );

  // Use locale-based month names
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) =>
      new Date(2000, i, 1).toLocaleDateString(i18n.language, { month: "long" })
    );
  }, [i18n.language]);

  // Use locale-based weekday abbreviations (Mon-first)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      // Start from Monday (index 1), wrap Sunday (index 0) to end
      const day = new Date(2000, 0, 3 + i); // Jan 3 2000 is Monday
      return day.toLocaleDateString(i18n.language, { weekday: "short" }).slice(0, 2);
    });
  }, [i18n.language]);

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
          accessibilityLabel={t("subscriptionForm.previousMonth")}
          onPress={() => moveMonth(-1)}
        >
          <Feather name="chevron-left" size={17} color={iconColor} />
        </AnimatedPressable>
        <View className="flex-1 items-center px-3">
          <Text className="text-base font-semibold text-ink">
            {monthNames[visibleMonth.getMonth()]} {visibleMonth.getFullYear()}
          </Text>
          <Text className="mt-0.5 text-xs text-muted">{formatDate(value, dateFormat)}</Text>
        </View>
        <AnimatedPressable
          className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface"
          hitSlop={8}
          accessibilityLabel={t("subscriptionForm.nextMonth")}
          onPress={() => moveMonth(1)}
        >
          <Feather name="chevron-right" size={17} color={iconColor} />
        </AnimatedPressable>
      </View>

      <View className="mt-4 flex-row gap-2">
        {([
          [t("subscriptions.card.today"), today()],
          [t("subscriptionForm.inOneWeek"), addDays(today(), 7)],
          [t("subscriptionForm.inOneMonth"), addMonths(today(), 1)]
        ] as [string, string][])
        .filter(([, next]) => !minDate || next >= minDate)
        .map(([label, next]) => (
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
          const isPast = !!minDate && iso < minDate;
          return (
            <View key={`${iso}-${index}`} style={{ width: `${100 / 7}%`, padding: 2 }}>
              {day ? (
                <AnimatedPressable
                  className={`h-10 items-center justify-center rounded-full ${
                    selected ? "bg-ink" : isToday ? "border border-border bg-surface" : isPast ? "opacity-20" : "bg-transparent"
                  }`}
                  hitSlop={2}
                  disabled={isPast}
                  accessibilityLabel={formatDate(iso, dateFormat)}
                  accessibilityState={{ selected }}
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isDark = useIsDark();
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
  const [appearanceExpanded, setAppearanceExpanded] = useState(!!initialValue);
  const [isTrial, setIsTrial] = useState(initialValue?.isTrial ?? false);
  const [cancelReminderDays, setCancelReminderDays] = useState<number | null>(initialValue?.cancelReminderDays ?? null);

  // Translated billing periods — built dynamically so t() is in scope
  const translatedBillingPeriods = billingPeriods.map((b) => ({
    ...b,
    label: t(`billingPeriods.${b.value}`)
  }));

  // Translated categories
  const translatedCategories = categories.map((c) => ({
    ...c,
    label: t(`categories.${c.value}`)
  }));

  // Smart suggestions based on name input
  const nameSuggestions = useMemo(() => {
    const trimmed = name.trim();
    if (trimmed.length < 1) return [];
    const lower = trimmed.toLowerCase();
    return serviceSuggestions
      .filter((s) => {
        const searchable = [s.name, ...(s.aliases ?? [])].map((value) => value.toLowerCase());
        return searchable.some((value) => value.startsWith(lower) || value.includes(lower)) && s.name.toLowerCase() !== lower;
      })
      .slice(0, 8);
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

    if (!trimmedName || trimmedName.length > 120) {
      setFormError(t("subscriptionForm.invalidName"));
      return;
    }
    if (!amount.trim() || !Number.isFinite(parsedAmount) || parsedAmount < 0 || parsedAmount > 9999999999.99) {
      setFormError(t("subscriptionForm.invalidAmount"));
      return;
    }
    if (billingPeriod === "custom" && (!Number.isSafeInteger(parsedCustomDays) || parsedCustomDays < 1 || parsedCustomDays > 3650)) {
      setFormError(t("subscriptionForm.invalidPeriod"));
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
        notes: notes.trim(),
        isTrial,
        isArchived: initialValue?.isArchived ?? false,
        cancelReminderDays: cancelReminderDays ?? null
      });
      haptic.success();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t("subscriptionForm.validationError"));
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

        <View className="flex-row items-center gap-4 rounded-3xl border border-border bg-surface p-5">
          <ServiceIcon name={name || "?"} iconSlug={iconSlug || undefined} color={color} size={56} />
          <View className="flex-1">
            <Text className="text-xl font-bold text-ink" numberOfLines={1}>
              {name.trim() || t("subscriptionForm.fields.namePlaceholder")}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {amount || "0"} {currency} · {translatedBillingPeriods.find((b) => b.value === billingPeriod)?.label ?? ""}
            </Text>
          </View>
          <View className="h-12 w-1 rounded-full" style={{ backgroundColor: color }} />
        </View>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <FormStepHeader
            icon="credit-card"
            title={t("subscriptionForm.fields.name")}
            subtitle={t("subscriptionForm.fields.category")}
          />
          <Label top>{t("subscriptionForm.fields.name")}</Label>
          <TextInput
            className={`rounded-xl border bg-bg px-4 py-4 text-base text-ink ${formError && !name.trim() ? "border-danger" : "border-border"}`}
            placeholder={t("subscriptionForm.fields.namePlaceholder")}
            placeholderTextColor="#525252"
            value={name}
            onChangeText={(v) => { setName(v); if (formError) setFormError(null); }}
            accessibilityLabel={t("subscriptionForm.fields.name")}
            maxLength={120}
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

          <Label>{t("subscriptionForm.fields.category")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {translatedCategories.map((item) => {
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
                  accessibilityLabel={item.label}
                  accessibilityState={{ selected }}
                  hitSlop={4}
                  onPress={() => setCategory(item.value)}
                >
                  <Feather name={iconName} size={13} color={selected ? (isDark ? "#0a0a0a" : "#fafafa") : (isDark ? "#a3a3a3" : "#525252")} />
                  <Text className={selected ? "text-sm font-semibold text-bg" : "text-sm font-semibold text-muted"}>
                    {item.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          <AnimatedPressable
            className="mt-5 flex-row items-center justify-between rounded-2xl border border-border bg-bg px-4 py-3.5"
            onPress={() => setAppearanceExpanded((value) => !value)}
          >
            <View className="flex-row items-center gap-3">
              <View className="h-8 w-8 rounded-full" style={{ backgroundColor: color }} />
              <View>
                <Text className="text-sm font-semibold text-ink">{t("subscriptionForm.appearance")}</Text>
                <Text className="mt-0.5 text-xs text-muted">{t("subscriptionForm.appearanceHint")}</Text>
              </View>
            </View>
            <Feather name={appearanceExpanded ? "chevron-up" : "chevron-down"} size={18} color="#a3a3a3" />
          </AnimatedPressable>

          {appearanceExpanded ? (
            <View>
              <Label>{t("subscriptionForm.icon")}</Label>
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
                    +{serviceIconOptions.length - 8}
                  </Text>
                </AnimatedPressable>
              ) : null}

              <Label>{t("subscriptionForm.color")}</Label>
              <View className="flex-row flex-wrap gap-3">
                {iconColors.map((item) => {
                  const selected = color.toLowerCase() === item.toLowerCase();
                  return (
                    <AnimatedPressable
                      key={item}
                      className={`h-12 w-12 items-center justify-center rounded-full border ${selected ? "border-ink" : "border-transparent"}`}
                      accessibilityLabel={t("subscriptionForm.colorValue", { color: item })}
                      accessibilityState={{ selected }}
                      onPress={() => setColor(item)}
                    >
                      <View className="h-9 w-9 rounded-full" style={{ backgroundColor: item }} />
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <FormStepHeader
            icon="dollar-sign"
            title={t("subscriptionForm.fields.amount")}
            subtitle={t("subscriptionForm.fields.currency")}
          />
          <Label top>{t("subscriptionForm.fields.amount")}</Label>
          <TextInput
            className={`rounded-xl border bg-bg px-4 py-4 text-2xl font-bold text-ink ${formError && Number(amount.replace(",", ".")) <= 0 ? "border-danger" : "border-border"}`}
            placeholder="0.00"
            placeholderTextColor="#525252"
            accessibilityLabel={t("subscriptionForm.fields.amount")}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(v) => { setAmount(v); if (formError) setFormError(null); }}
          />

          <Label>{t("subscriptionForm.fields.currency")}</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="rounded-xl border border-border bg-bg p-1">
            <View className="flex-row gap-1">
              {currencies.map((item) => (
                <AnimatedPressable
                  key={item}
                  className={`h-11 min-w-[56px] items-center justify-center rounded-lg px-3 ${currency === item ? "bg-ink" : ""}`}
                  hitSlop={4}
                  accessibilityState={{ selected: currency === item }}
                  onPress={() => setCurrency(item)}
                >
                  <Text className={`text-sm ${currency === item ? "font-semibold text-bg" : "font-semibold text-muted"}`}>
                    {item}
                  </Text>
                </AnimatedPressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <FormStepHeader
            icon="calendar"
            title={t("subscriptionForm.fields.billingPeriod")}
            subtitle={t("subscriptionForm.fields.renewalDate")}
          />
          <Label top>{t("subscriptionForm.fields.billingPeriod")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {translatedBillingPeriods.map((item) => (
              <AnimatedPressable
                key={item.value}
                className={`h-11 items-center justify-center rounded-xl border ${billingPeriod === item.value ? "border-ink bg-ink" : "border-border bg-bg"}`}
                style={{ width: "48%" }}
                hitSlop={4}
                accessibilityState={{ selected: billingPeriod === item.value }}
                onPress={() => setBillingPeriod(item.value)}
              >
                <Text className={billingPeriod === item.value ? "text-sm font-semibold text-bg" : "text-sm font-semibold text-muted"}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            ))}
          </View>

          {billingPeriod === "custom" ? (
            <>
              <Label>{t("subscriptionForm.fields.customPeriodDays", { days: customPeriodDays })}</Label>
              <TextInput
                className={`rounded-xl border bg-bg px-4 py-4 text-base text-ink ${formError && Number(customPeriodDays) <= 0 ? "border-danger" : "border-border"}`}
                placeholder={t("subscriptionForm.fields.customPeriodDays", { days: "X" })}
                placeholderTextColor="#525252"
                accessibilityLabel={t("subscriptionForm.fields.customPeriodDays", { days: customPeriodDays })}
                keyboardType="number-pad"
                value={customPeriodDays}
                onChangeText={(v) => { setCustomPeriodDays(v); if (formError) setFormError(null); }}
              />
            </>
          ) : null}

          <Label>{isTrial ? t("subscriptionForm.trialEndDate") : t("subscriptionForm.fields.renewalDate")}</Label>
          <DateSelector value={renewalDate} onChange={setRenewalDate} minDate={isTrial ? today() : undefined} />
          {renewalDate < today() ? (
            <View className="mt-2 flex-row items-center gap-2">
              <Feather name="info" size={13} color="#525252" />
              <Text className="flex-1 text-xs text-muted">
                {t("subscriptionForm.pastDateHint")}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <FormStepHeader icon="tag" title={t("subscriptionForm.fields.isTrial")} subtitle={t("subscriptionForm.reminderHint")} />

          <View className="flex-row items-center justify-between py-1">
            <View className="flex-1 pr-4">
              <Text className="text-base text-ink">{t("subscriptionForm.fields.isTrial")}</Text>
              <Text className="mt-0.5 text-xs text-muted">{t("subscriptions.detail.trial")}</Text>
            </View>
            <Switch
              accessibilityLabel={t("subscriptionForm.fields.isTrial")}
              value={isTrial}
              onValueChange={(value) => {
                setIsTrial(value);
                if (value && renewalDate < today()) setRenewalDate(today());
              }}
              trackColor={{ false: "#737373", true: isDark ? "#fafafa" : "#0a0a0a" }}
              thumbColor={isDark ? "#0a0a0a" : "#fafafa"}
            />
          </View>

          <View className="my-4 h-px bg-border" />

          <Label>{t("subscriptionForm.fields.cancelReminderDays")}</Label>
          <View className="flex-row flex-wrap gap-2">
            {([
              { label: t("subscriptionForm.fields.cancelReminderNone"), value: null },
              { label: t("subscriptions.card.daysLeft", { days: 1 }), value: 1 },
              { label: t("subscriptions.card.daysLeft", { days: 2 }), value: 2 },
              { label: t("subscriptions.card.daysLeft", { days: 3 }), value: 3 },
              { label: t("subscriptions.card.daysLeft", { days: 7 }), value: 7 }
            ] as { label: string; value: number | null }[]).map((option) => {
              const selected = cancelReminderDays === option.value;
              return (
                <AnimatedPressable
                  key={String(option.value)}
                  className={`h-10 items-center justify-center rounded-xl border px-4 ${selected ? "border-ink bg-ink" : "border-border bg-bg"}`}
                  accessibilityState={{ selected }}
                  onPress={() => setCancelReminderDays(option.value)}
                >
                  <Text className={`text-sm font-semibold ${selected ? "text-bg" : "text-muted"}`}>{option.label}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View className="rounded-2xl border border-border bg-surface p-5">
          <FormStepHeader
            icon="file-text"
            title={t("subscriptionForm.fields.notes")}
            subtitle={t("subscriptionForm.fields.notesPlaceholder")}
          />
          <Label top>{t("subscriptionForm.fields.notes")}</Label>
          <TextInput
            className="min-h-24 rounded-xl border border-border bg-bg px-4 py-4 text-base text-ink"
            placeholder={t("subscriptionForm.fields.notesPlaceholder")}
            placeholderTextColor="#525252"
            accessibilityLabel={t("subscriptionForm.fields.notes")}
            maxLength={2000}
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
          <Text accessibilityRole="alert" accessibilityLiveRegion="polite" className="mb-2 text-center text-sm font-medium text-danger">{formError}</Text>
        ) : null}
        <AnimatedPressable
          className={`rounded-2xl px-5 py-4 ${isSubmitting ? "bg-border" : "bg-accent"}`}
          disabled={isSubmitting}
          onPress={submit}
        >
          <Text className="text-center font-semibold text-bg">
            {isSubmitting ? t("common.loading") : submitLabel}
          </Text>
        </AnimatedPressable>
      </View>
    </KeyboardAvoidingView>
  );
}
