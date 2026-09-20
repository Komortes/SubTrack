import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import i18next from "@/lib/i18n";
import { clearLocalRenewalNotifications, syncLocalRenewalNotifications } from "@/lib/notifications";
import { enqueueMutation, flushOfflineQueue, getOfflineQueueSize, OfflineMutation } from "@/lib/sync";
import { nextRenewalDate } from "@/lib/subscriptionMath";
import { Subscription } from "@/lib/types";
import { useSettingsStore } from "@/store/settingsStore";
import { useAuthStore } from "@/store/authStore";
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
    (set, get) => {
      let revision = 0;
      let generation = 0;
      let pendingWrites = 0;
      let activeSync: Promise<void> | null = null;
      let activeSyncGeneration = -1;
      let activeSyncUserId: number | null = null;
      let syncRequested = false;
      let pendingMutations: OfflineMutation[] = [];
      let activePersistence: Promise<void> | null = null;

      const changeSubscriptions = (update: (subscriptions: Subscription[]) => Subscription[]) => {
        revision += 1;
        set((state) => ({ subscriptions: update(state.subscriptions), syncError: null }));
        refreshDerivedData();
      };

      const persistPendingMutations = async (): Promise<void> => {
        while (pendingMutations.length > 0) {
          if (!activePersistence) {
            activePersistence = (async () => {
              while (pendingMutations.length > 0) {
                const mutation = pendingMutations[0];
                await enqueueMutation(mutation);
                if (pendingMutations[0]?.id === mutation.id) pendingMutations.shift();
              }
            })().finally(() => { activePersistence = null; });
          }
          await activePersistence;
        }
      };

      const queueChanges = async (mutations: Omit<OfflineMutation, "id" | "createdAt">[]) => {
        const startedAtGeneration = generation;
        const userId = useAuthStore.getState().userId;
        // Keep failed storage writes in order for the next save or manual sync.
        pendingMutations.push(...mutations.map((mutation) => ({
          ...mutation,
          id: createLocalId(),
          createdAt: new Date().toISOString()
        })));
        pendingWrites += 1;
        try {
          await persistPendingMutations();
          if (startedAtGeneration !== generation || useAuthStore.getState().userId !== userId) return;
          await get().refreshPendingSyncCount();
        } catch (error) {
          if (startedAtGeneration === generation && useAuthStore.getState().userId === userId) {
            set({ syncError: error instanceof Error ? error.message : i18next.t("home.syncError") });
          }
          throw error;
        } finally {
          pendingWrites -= 1;
        }

        if (!useAuthStore.getState().isOfflineMode) {
          if (activeSync && activeSyncGeneration === generation && activeSyncUserId === useAuthStore.getState().userId) {
            syncRequested = true;
          } else {
            void get().syncFromServer().catch(() => undefined);
          }
        }
      };

      const enforceFreeLimit = (subscriptions: Subscription[]) => {
        const currentCount = get().subscriptions.filter((item) => !item.isArchived).length;
        const nextCount = subscriptions.filter((item) => !item.isArchived).length;
        if (!useProStore.getState().isPro && nextCount > FREE_SUBSCRIPTION_LIMIT && nextCount > currentCount) {
          throw new Error("FREE_LIMIT_REACHED");
        }
      };

      return {
        subscriptions: [],
        isSyncing: false,
        syncError: null,
        pendingSyncCount: 0,
        lastSyncedAt: null,
        refreshPendingSyncCount: async () => {
          const startedAtGeneration = generation;
          const userId = useAuthStore.getState().userId;
          const pendingSyncCount = await getOfflineQueueSize();
          if (generation === startedAtGeneration && useAuthStore.getState().userId === userId) {
            set({ pendingSyncCount });
          }
        },
        setSubscriptions: (subscriptions) => changeSubscriptions(() => subscriptions),
        resetSubscriptions: () => {
          revision += 1;
          generation += 1;
          pendingMutations = [];
          syncRequested = false;
          set({ subscriptions: [], isSyncing: false, syncError: null, pendingSyncCount: 0, lastSyncedAt: null });
          refreshDerivedData();
        },
        refreshSubscription: async (id) => {
          const auth = useAuthStore.getState();
          const startedAtRevision = revision;
          if (auth.isOfflineMode || pendingWrites > 0 || pendingMutations.length > 0 || await getOfflineQueueSize() > 0) return;
          if (revision !== startedAtRevision) return;

          const subscription = await api.fetchSubscription(id);
          const pendingSyncCount = await getOfflineQueueSize();
          const currentAuth = useAuthStore.getState();
          if (revision !== startedAtRevision || pendingWrites > 0 || pendingMutations.length > 0 || pendingSyncCount > 0
            || currentAuth.isOfflineMode || currentAuth.userId !== auth.userId) return;

          set((state) => ({
            subscriptions: state.subscriptions.map((item) => item.id === id ? subscription : item),
            syncError: null
          }));
          refreshDerivedData();
        },
        syncFromServer: () => {
          if (useAuthStore.getState().isOfflineMode) {
            return persistPendingMutations().then(() => get().refreshPendingSyncCount());
          }
          const userId = useAuthStore.getState().userId;
          if (activeSync) {
            if (activeSyncGeneration === generation && activeSyncUserId === userId) return activeSync;
            set({ isSyncing: true, syncError: null });
            return activeSync.catch(() => undefined).then(() => get().syncFromServer());
          }
          const startedAtGeneration = generation;
          const isCurrentSession = () => {
            const auth = useAuthStore.getState();
            return generation === startedAtGeneration && !auth.isOfflineMode && auth.userId === userId;
          };
          activeSyncGeneration = generation;
          activeSyncUserId = userId;
          set({ isSyncing: true, syncError: null });

          activeSync = (async () => {
            try {
              do {
                syncRequested = false;
                if (pendingMutations.length > 0) await persistPendingMutations();
                if (!isCurrentSession()) break;
                await flushOfflineQueue();
                const startedAtRevision = revision;
                const pendingSyncCount = await getOfflineQueueSize();
                if (!isCurrentSession()) break;
                set({ pendingSyncCount });
                if (pendingWrites > 0 || pendingMutations.length > 0 || pendingSyncCount > 0) continue;

                const subscriptions = await api.fetchSubscriptions();
                const remaining = await getOfflineQueueSize();
                if (!isCurrentSession()) break;
                if (revision === startedAtRevision && pendingWrites === 0 && pendingMutations.length === 0 && remaining === 0) {
                  const previous = new Map(get().subscriptions.map((item) => [item.id, item]));
                  set({
                    subscriptions: subscriptions.map((item) => ({
                      ...item,
                      paymentHistory: item.paymentHistory ?? previous.get(item.id)?.paymentHistory
                    })),
                    pendingSyncCount: 0,
                    lastSyncedAt: new Date().toISOString()
                  });
                  syncRequested = false;
                  refreshDerivedData();
                } else {
                  set({ pendingSyncCount: remaining });
                }
              } while (syncRequested && isCurrentSession());
            } catch (error) {
              if (isCurrentSession()) {
                const pendingSyncCount = await getOfflineQueueSize();
                if (isCurrentSession()) {
                  set({ syncError: error instanceof Error ? error.message : i18next.t("home.syncError"), pendingSyncCount });
                }
              }
              throw error;
            } finally {
              activeSync = null;
              if (isCurrentSession()) set({ isSyncing: false });
            }
          })();
          return activeSync;
        },
        addSubscription: (subscription) => {
          void get().importSubscriptions([subscription]).catch(() => undefined);
        },
        createSubscription: async (subscription) => {
          const localSubscription: Subscription = {
            ...subscription,
            id: createLocalId(),
            createdAt: new Date().toISOString()
          };
          enforceFreeLimit([localSubscription, ...get().subscriptions]);
          changeSubscriptions((items) => [localSubscription, ...items]);
          await queueChanges([{
            method: "POST", path: "/subscriptions", payload: api.toApiSubscription(localSubscription)
          }]);
        },
        updateSubscription: async (id, patch) => {
          if (!get().subscriptions.some((item) => item.id === id)) return;
          const subscriptions = get().subscriptions.map((item) =>
            item.id === id ? { ...item, ...patch, id: item.id } : item
          );
          enforceFreeLimit(subscriptions);
          changeSubscriptions(() => subscriptions);
          await queueChanges([{
            method: "PUT", path: `/subscriptions/${id}`,
            payload: api.toApiSubscription(patch, { includeId: false })
          }]);
        },
        deleteSubscription: async (id) => {
          changeSubscriptions((items) => items.filter((item) => item.id !== id));
          await queueChanges([{ method: "DELETE", path: `/subscriptions/${id}` }]);
        },
        deleteAllSubscriptions: async () => {
          changeSubscriptions(() => []);
          await queueChanges([{ method: "DELETE", path: "/subscriptions" }]);
        },
        importSubscriptions: async (subscriptions) => {
          const existingIds = new Set(get().subscriptions.map((item) => item.id));
          const uniqueImports = [...new Map(subscriptions.map((item) => [item.id, item])).values()];
          const created = uniqueImports.filter((item) => !existingIds.has(item.id)).length;
          const updated = uniqueImports.length - created;
          if (uniqueImports.length === 0) return { created, updated };
          const importedIds = new Set(uniqueImports.map((item) => item.id));
          const combined = [...uniqueImports, ...get().subscriptions.filter((item) => !importedIds.has(item.id))];
          enforceFreeLimit(combined);
          changeSubscriptions(() => combined);
          await queueChanges(uniqueImports.map((subscription) => {
            const exists = existingIds.has(subscription.id);
            return {
              method: exists ? "PUT" : "POST",
              path: exists ? `/subscriptions/${subscription.id}` : "/subscriptions",
              payload: api.toApiSubscription(subscription, { includeId: !exists })
            };
          }));
          return { created, updated };
        },
        markPaid: async (id, syncWithServer = true) => {
          if (!get().subscriptions.some((item) => item.id === id)) return;
          const paymentId = createLocalId();
          changeSubscriptions((items) => items.map((item) => item.id === id ? {
            ...item,
            renewalDate: nextRenewalDate(item),
            paymentHistory: [{
              id: paymentId, subscriptionId: id, paidAt: new Date().toISOString(),
              amount: item.amount, currency: item.currency
            }, ...(item.paymentHistory ?? [])].slice(0, 5)
          } : item));
          if (syncWithServer) {
            await queueChanges([{ method: "POST", path: `/subscriptions/${id}/renew`, payload: { payment_id: paymentId } }]);
          }
        },
        archiveSubscription: async (id) => {
          await get().updateSubscription(id, { isActive: false, isArchived: true });
        }
      };
    },
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

let derivedDataUpdate: Promise<void> = Promise.resolve();

function refreshDerivedData(): void {
  // Notification rescheduling cancels old reminders, so overlapping runs must
  // finish in order. Read the latest snapshot when each run begins.
  derivedDataUpdate = derivedDataUpdate.then(async () => {
    const { subscriptions } = useSubscriptionStore.getState();
    const settings = useSettingsStore.getState();
    await Promise.allSettled([
      useAuthStore.getState().isOfflineMode ? syncLocalRenewalNotifications(subscriptions, {
        notifyThreeDays: settings.notifyThreeDays,
        notifyOneDay: settings.notifyOneDay,
        notifySameDay: settings.notifySameDay,
        notificationTime: settings.notificationTime
      }) : clearLocalRenewalNotifications(),
      updateWidgetData(subscriptions)
    ]);
  }).catch(() => undefined);
}
