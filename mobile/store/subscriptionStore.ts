import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import { seedSubscriptions } from "@/lib/seed";
import { nextRenewalDate } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";

type SubscriptionState = {
  subscriptions: Subscription[];
  isSyncing: boolean;
  syncError: string | null;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  syncFromServer: () => Promise<void>;
  addSubscription: (subscription: Subscription) => void;
  createSubscription: (subscription: Omit<Subscription, "id" | "createdAt">) => Promise<void>;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  deleteSubscription: (id: string) => void;
  markPaid: (id: string, syncWithServer?: boolean) => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set) => ({
      subscriptions: seedSubscriptions,
      isSyncing: false,
      syncError: null,
      setSubscriptions: (subscriptions) => set({ subscriptions }),
      syncFromServer: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          const subscriptions = await api.fetchSubscriptions();
          set({ subscriptions, isSyncing: false });
        } catch (error) {
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : "Не удалось синхронизировать подписки"
          });
          throw error;
        }
      },
      addSubscription: (subscription) =>
        set((state) => ({ subscriptions: [subscription, ...state.subscriptions] })),
      createSubscription: async (subscription) => {
        set({ isSyncing: true, syncError: null });
        try {
          const created = await api.createSubscription(subscription);
          set((state) => ({
            subscriptions: [created, ...state.subscriptions.filter((item) => item.id !== created.id)],
            isSyncing: false
          }));
        } catch (error) {
          const localSubscription: Subscription = {
            ...subscription,
            id: `${subscription.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
            createdAt: new Date().toISOString()
          };

          set((state) => ({
            subscriptions: [localSubscription, ...state.subscriptions],
            isSyncing: false,
            syncError: error instanceof Error ? error.message : "Сохранено локально"
          }));
        }
      },
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
      markPaid: async (id, syncWithServer = true) => {
        if (syncWithServer) {
          try {
            const renewed = await api.renewSubscription(id);
            set((state) => ({
              subscriptions: state.subscriptions.map((item) => (item.id === id ? renewed : item)),
              syncError: null
            }));
            return;
          } catch (error) {
            set({ syncError: error instanceof Error ? error.message : "Оплата отмечена локально" });
          }
        }

        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, renewalDate: nextRenewalDate(item) } : item
          )
        }));
      }
    }),
    {
      name: "subtrack:subscriptions",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
