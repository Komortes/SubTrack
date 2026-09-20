import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Subscription } from "@/lib/types";

type Props = {
  subscriptions: Subscription[];
};

export function PaymentCalendar({ subscriptions }: Props) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const todayDate = today.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7; // Mon-first offset

  // Use locale-aware short weekday names (Mon-first)
  const DAY_LABELS = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2000, 0, 3 + i); // Jan 3 2000 is Monday
    return d.toLocaleDateString(i18n.language, { weekday: "short" }).slice(0, 2);
  });

  const byDay = new Map<number, Subscription[]>();
  for (const sub of subscriptions) {
    if (!sub.isActive) continue;
    const d = new Date(`${sub.renewalDate}T00:00:00`);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day)!.push(sub);
    }
  }

  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startOffset).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const todayWeekIndex = weeks.findIndex((w) => w.includes(todayDate));
  const displayWeeks = expanded ? weeks : weeks.slice(todayWeekIndex, todayWeekIndex + 1);
  const monthName = today.toLocaleDateString(i18n.language, { month: "long", year: "numeric" });

  return (
    <View className="rounded-3xl border border-border bg-surface p-5">
      <Pressable accessibilityRole="button" accessibilityLabel={t("home.paymentCalendar")} accessibilityState={{ expanded }} onPress={() => setExpanded((v) => !v)}>
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xs font-semibold uppercase tracking-widest text-muted">{t("home.paymentCalendar")}</Text>
          <Text className="text-xs capitalize text-subtle">
            {expanded ? monthName : t("subscriptions.upcoming.title")}
          </Text>
        </View>
      </Pressable>

      <View className="mb-2 flex-row">
        {DAY_LABELS.map((label) => (
          <View key={label} className="flex-1 items-center">
            <Text className="text-xs text-muted">{label}</Text>
          </View>
        ))}
      </View>

      {displayWeeks.map((weekRow, wi) => (
        <View key={wi} className="mb-1 flex-row">
          {weekRow.map((day, di) => {
            const isToday = day === todayDate;
            const isPast = day !== null && day < todayDate;
            const subs = day ? (byDay.get(day) ?? []) : [];
            return (
              <View key={di} className="flex-1 items-center py-0.5">
                {day !== null ? (
                  <>
                    <View
                      className={`h-7 w-7 items-center justify-center rounded-full ${isToday ? "bg-accent" : ""}`}
                    >
                      <Text
                        className={`text-sm ${
                          isToday ? "font-bold text-bg" : isPast ? "text-muted" : "text-ink"
                        }`}
                      >
                        {day}
                      </Text>
                    </View>
                    <View className="mt-0.5 h-1.5 flex-row items-center gap-0.5">
                      {subs.slice(0, 3).map((sub, si) => (
                        <View
                          key={si}
                          className="h-1 w-1 rounded-full"
                          style={{ backgroundColor: sub.color }}
                        />
                      ))}
                    </View>
                  </>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}

      {!expanded && weeks.length > 1 ? (
        <Pressable onPress={() => setExpanded(true)} className="mt-2 items-center">
          <Text className="text-xs text-muted">{monthName}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
