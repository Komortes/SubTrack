import { useMemo } from "react";
import { useSubscriptionStore } from "@/store/subscriptionStore";

export function useSubscriptions() {
  const subscriptions = useSubscriptionStore((state) => state.subscriptions);

  return useMemo(
    () => ({
      subscriptions,
      activeSubscriptions: subscriptions.filter((item) => item.isActive),
      recentlyAdded: [...subscriptions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3)
    }),
    [subscriptions]
  );
}

