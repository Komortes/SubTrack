import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import i18next from "@/lib/i18n";
import { syncLocalRenewalNotifications } from "@/lib/notifications";
import { seedSubscriptions } from "@/lib/seed";
import { enqueueMutation, flushOfflineQueue, getOfflineQueueSize } from "@/lib/sync";
import { nextRenewalDate } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useProStore } from "@/store/proStore";
import { updateWidgetData } from "@/lib/widgetData";

export const FREE_SUBSCRIPTION_LIMIT = 5;

type SubscriptionState = {
  subscriptions: Subscription[];
  isSyncing: boolean;
  syncError: string | null;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
  refreshPendingSyncCount: () => Promise<void>;
  setSubscriptions: (subscriptions: Subscription[]) => void;
  resetSubscriptions: () => void;
  syncFromServer: () => Promise<void>;
  addSubscription: (subscription: Subscription) => void;
  refreshSubscription: (id: string) => Promise<void>;
  createSubscription: (subscription: Omit<Subscription, "id" | "createdAt">) => Promise<void>;
  updateSubscription: (id: string, patch: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  deleteAllSubscriptions: () => Promise<void>;
  importSubscriptions: (subscriptions: Subscription[]) => Promise<{ created: number; updated: number }>;
  markPaid: (id: string, syncWithServer?: boolean) => Promise<void>;
  archiveSubscription: (id: string) => Promise<void>;
};

export const useSubscriptionStore = create<SubscriptionState>()(
  persist(
    (set, get) => ({
      subscriptions: seedSubscriptions,
      isSyncing: false,
      syncError: null,
      pendingSyncCount: 0,
      lastSyncedAt: null,
      refreshPendingSyncCount: async () => {
        set({ pendingSyncCount: await getOfflineQueueSize() });
      },
      setSubscriptions: (subscriptions) => set({ subscriptions }),
      resetSubscriptions: () => set({ subscriptions: [], isSyncing: false, syncError: null, pendingSyncCount: 0, lastSyncedAt: null }),
      refreshSubscription: async (id) => {
        const subscription = await api.fetchSubscription(id);
        set((state) => ({
          subscriptions: state.subscriptions.map((item) => (item.id === id ? subscription : item)),
          syncError: null
        }));
      },
      syncFromServer: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          await flushOfflineQueue();
          const subscriptions = await api.fetchSubscriptions();
          set({
            subscriptions,
            isSyncing: false,
            pendingSyncCount: await getOfflineQueueSize(),
            lastSyncedAt: new Date().toISOString()
          });
          updateWidgetData(subscriptions).catch(() => undefined);
        } catch (error) {
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : i18next.t("home.syncError")
          });
          throw error;
        }
      },
      addSubscription: (subscription) =>
        set((state) => ({ subscriptions: [subscription, ...state.subscriptions] })),
      createSubscription: async (subscription) => {
        const { isPro } = useProStore.getState();
        const { subscriptions } = get();
        const activeCount = subscriptions.filter((s) => !s.isArchived).length;
        if (!isPro && activeCount >= FREE_SUBSCRIPTION_LIMIT) {
          throw new Error("FREE_LIMIT_REACHED");
        }
        const localId = createLocalId();
        const localSubscription: Subscription = {
          ...subscription,
          id: localId,
          createdAt: new Date().toISOString()
        };

        set((state) => ({
          subscriptions: [localSubscription, ...state.subscriptions],
          isSyncing: true,
          syncError: null
        }));

        try {
          const created = await api.createSubscription({ ...subscription, id: localId });
          set((state) => ({
            subscriptions: [created, ...state.subscriptions.filter((item) => item.id !== localId && item.id !== created.id)],
            isSyncing: false
          }));
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "POST",
            path: "/subscriptions",
            payload: api.toApiSubscription({ ...localSubscription }),
            createdAt: new Date().toISOString()
          });
          set({
            isSyncing: false,
            pendingSyncCount: await getOfflineQueueSize(),
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("common.inQueue", { count: 1 })}` : i18next.t("common.inQueue", { count: 1 })
          });
        }
        resyncNotifications();
        updateWidgetData(get().subscriptions).catch(() => undefined);
      },
      updateSubscription: async (id, patch) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, ...patch } : item
          )
        }));

        try {
          const updated = await api.updateSubscription(id, patch);
          set((state) => ({
            subscriptions: state.subscriptions.map((item) => (item.id === id ? updated : item)),
            syncError: null
          }));
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "PUT",
            path: `/subscriptions/${id}`,
            payload: api.toApiSubscription(patch, { includeId: false }),
            createdAt: new Date().toISOString()
          });
          set({
            pendingSyncCount: await getOfflineQueueSize(),
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("common.inQueue", { count: 1 })}` : i18next.t("common.inQueue", { count: 1 })
          });
        }
        resyncNotifications();
        updateWidgetData(get().subscriptions).catch(() => undefined);
      },
      deleteSubscription: async (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.filter((item) => item.id !== id)
        }));

        try {
          await api.deleteSubscription(id);
          set({ syncError: null });
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "DELETE",
            path: `/subscriptions/${id}`,
            createdAt: new Date().toISOString()
          });
          set({
            pendingSyncCount: await getOfflineQueueSize(),
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("common.inQueue", { count: 1 })}` : i18next.t("common.inQueue", { count: 1 })
          });
        }
        resyncNotifications();
        updateWidgetData(get().subscriptions).catch(() => undefined);
      },
      deleteAllSubscriptions: async () => {
        set({ subscriptions: [], syncError: null });

        try {
          await api.deleteAllSubscriptions();
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "DELETE",
            path: "/subscriptions",
            createdAt: new Date().toISOString()
          });
          set({
            pendingSyncCount: await getOfflineQueueSize(),
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("common.inQueue", { count: 1 })}` : i18next.t("common.inQueue", { count: 1 })
          });
        }
      },
      importSubscriptions: async (subscriptions) => {
        const existingIds = new Set(get().subscriptions.map((item) => item.id));
        const created = subscriptions.filter((item) => !existingIds.has(item.id)).length;
        const updated = subscriptions.length - created;

        set((state) => {
          const importedIds = new Set(subscriptions.map((item) => item.id));

          return {
            subscriptions: [
              ...subscriptions,
              ...state.subscriptions.filter((item) => !importedIds.has(item.id))
            ],
            syncError: null
          };
        });

        for (const subscription of subscriptions) {
          const exists = existingIds.has(subscription.id);
          try {
            if (exists) {
              await api.updateSubscription(subscription.id, subscription);
            } else {
              await api.createSubscription(subscription);
            }
          } catch {
            await enqueueMutation({
              id: createLocalId(),
              method: exists ? "PUT" : "POST",
              path: exists ? `/subscriptions/${subscription.id}` : "/subscriptions",
              payload: api.toApiSubscription(subscription, { includeId: !exists }),
              createdAt: new Date().toISOString()
            });
          }
        }

        set({ pendingSyncCount: await getOfflineQueueSize() });
        return { created, updated };
      },
      markPaid: async (id, syncWithServer = true) => {
        if (syncWithServer) {
          try {
            const renewed = await api.renewSubscription(id);
            set((state) => ({
              subscriptions: state.subscriptions.map((item) => (item.id === id ? renewed : item)),
              syncError: null
            }));
            updateWidgetData(get().subscriptions).catch(() => undefined);
            return;
          } catch (error) {
            await enqueueMutation({
              id: createLocalId(),
              method: "POST",
              path: `/subscriptions/${id}/renew`,
              createdAt: new Date().toISOString()
            });
            set({
              pendingSyncCount: await getOfflineQueueSize(),
              syncError: error instanceof Error ? error.message : i18next.t("common.inQueue", { count: 1 })
            });
          }
        }

        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  renewalDate: nextRenewalDate(item),
                  paymentHistory: [
                    {
                      id: createLocalId(),
                      subscriptionId: item.id,
                      paidAt: new Date().toISOString(),
                      amount: item.amount,
                      currency: item.currency
                    },
                    ...(item.paymentHistory ?? [])
                  ].slice(0, 5)
                }
              : item
          )
        }));
        updateWidgetData(get().subscriptions).catch(() => undefined);
      },
      archiveSubscription: async (id) => {
        set((state) => ({
          subscriptions: state.subscriptions.map((item) =>
            item.id === id ? { ...item, isActive: false, isArchived: true } : item
          )
        }));
        try {
          const updated = await api.updateSubscription(id, { isActive: false, isArchived: true });
          set((state) => ({
            subscriptions: state.subscriptions.map((item) => (item.id === id ? updated : item)),
            syncError: null
          }));
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "PUT",
            path: `/subscriptions/${id}`,
            payload: api.toApiSubscription({ isActive: false, isArchived: true }, { includeId: false }),
            createdAt: new Date().toISOString()
          });
          set({
            pendingSyncCount: await getOfflineQueueSize(),
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("common.inQueue", { count: 1 })}` : i18next.t("common.inQueue", { count: 1 })
          });
        }
        resyncNotifications();
        updateWidgetData(get().subscriptions).catch(() => undefined);
      }
    }),
    {
      name: "subtrack:subscriptions",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

function createLocalId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const resolved = char === "x" ? value : (value & 0x3) | 0x8;
    return resolved.toString(16);
  });
}

async function resyncNotifications(): Promise<void> {
  const { subscriptions } = useSubscriptionStore.getState();
  const settings = useSettingsStore.getState();
  await syncLocalRenewalNotifications(subscriptions, {
    notifyThreeDays: settings.notifyThreeDays,
    notifyOneDay: settings.notifyOneDay,
    notifySameDay: settings.notifySameDay,
    notificationTime: settings.notificationTime
  }).catch(() => undefined);
}
