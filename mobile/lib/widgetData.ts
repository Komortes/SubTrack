// @ts-ignore
import SharedGroupPreferences from "react-native-shared-group-preferences";
import { Subscription } from "@/lib/types";
import { normalizeMonthlyAmount, daysUntil } from "@/lib/subscriptionMath";
import { useSettingsStore } from "@/store/settingsStore";

const APP_GROUP = "group.app.subtrack.mobile";
const WIDGET_DATA_KEY = "subtrack_widget_data";

export async function updateWidgetData(subscriptions: Subscription[]): Promise<void> {
  try {
    const { primaryCurrency } = useSettingsStore.getState();
    const active = subscriptions.filter((s) => s.isActive && !s.isArchived);
    const monthlyTotal = active.reduce((sum, s) => sum + normalizeMonthlyAmount(s), 0);

    const upcoming = active
      .filter((s) => daysUntil(s.renewalDate) >= 0)
      .sort((a, b) => daysUntil(a.renewalDate) - daysUntil(b.renewalDate))
      .slice(0, 3)
      .map((s) => ({
        name: s.name,
        daysUntil: daysUntil(s.renewalDate),
        amount: s.amount,
        currency: s.currency,
      }));

    const payload = {
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      currency: primaryCurrency,
      activeCount: active.length,
      upcoming,
    };

    await SharedGroupPreferences.setItem(
      WIDGET_DATA_KEY,
      JSON.stringify(payload),
      APP_GROUP
    );
  } catch {
    // Non-fatal — widget data is best-effort
  }
}
