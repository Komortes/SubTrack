import { useMemo } from "react";
import { useSubscriptionStore } from "@/store/subscriptionStore";
import { daysUntil } from "@/lib/subscriptionMath";

export function useSubscriptions() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  return useMemo(
    () => ({
      subscriptions: subscriptions.filter((item) => !item.isArchived),
      activeSubscriptions: subscriptions.filter((item) => item.isActive && !item.isArchived),
      archivedSubscriptions: subscriptions.filter((item) => item.isArchived),
      recentlyAdded: subscriptions
        .filter((item) => !item.isArchived && daysUntil(item.renewalDate) > 7)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3)
    }),
    [subscriptions]
  );
}
