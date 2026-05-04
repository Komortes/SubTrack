import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { seedSubscriptions } from "@/lib/seed";
import { nextRenewalDate } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";

type SubscriptionState = {
  subscriptions: Subscription[];
  addSubscription: (subscription: Subscription) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  markPaid: (id: string) => void;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscriptions: seedSubscriptions,
      addSubscription: (subscription) =>
        set((state) => ({ subscriptions: [subscription, ...state.subscriptions] })),
      updateSubscription: (id, patch) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          )
        })),
      deleteSubscription: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.filter((item) => item.id !== id)
        })),
      markPaid: (id) =>
        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, renewalDate: nextRenewalDate(item) } : item
          )
        }))
    }),
    {
      name: "subtrack:subscriptions",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
