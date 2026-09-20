import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import { enqueueMutation, flushOfflineQueue, getOfflineQueueSize, OfflineMutation } from "@/lib/sync";
import i18next from "@/lib/i18n";
import { useAuthStore } from "@/store/authStore";

type BiometricTimeout = 1 | 5 | 15 | 60;

type SettingsState = api.UserSettings & {
  isSyncing: boolean;
  syncError: string | null;
  biometricLockEnabled: boolean;
  biometricLockTimeout: BiometricTimeout;
  resetSettings: () => void;
  syncFromServer: () => Promise<void>;
  updateSettings: (patch: Partial<api.UserSettings>, syncWithServer?: boolean) => Promise<void>;
  setBiometricLock: (enabled: boolean) => void;
  setBiometricLockTimeout: (timeout: BiometricTimeout) => void;
};

const defaults: api.UserSettings = {
  notifyThreeDays: true,
  notifyOneDay: true,
  notifySameDay: true,
  notificationTime: "09:00",
  primaryCurrency: "CZK",
  dateFormat: "DD.MM.YYYY",
  theme: "system"
};

export const useSettingsStore = create<SettingsState>()(
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

      return {
        ...defaults,
        isSyncing: false,
        syncError: null,
        biometricLockEnabled: false,
        biometricLockTimeout: 5 satisfies BiometricTimeout,
        resetSettings: () => {
          revision += 1;
          generation += 1;
          pendingMutations = [];
          syncRequested = false;
          set({ ...defaults, isSyncing: false, syncError: null, biometricLockEnabled: false, biometricLockTimeout: 5 satisfies BiometricTimeout });
        },
        syncFromServer: () => {
          if (useAuthStore.getState().isOfflineMode) return persistPendingMutations();
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
                const remaining = await getOfflineQueueSize();
                if (!isCurrentSession()) break;
                if (remaining > 0 || pendingWrites > 0 || pendingMutations.length > 0) continue;

                const settings = await api.fetchSettings();
                const stillPending = await getOfflineQueueSize();
                if (isCurrentSession() && revision === startedAtRevision && pendingWrites === 0
                  && pendingMutations.length === 0 && stillPending === 0) {
                  set({ ...settings, syncError: null });
                  syncRequested = false;
                }
              } while (syncRequested && isCurrentSession());
            } catch (error) {
              if (isCurrentSession()) {
                set({ syncError: error instanceof Error ? error.message : i18next.t("settings.syncError") });
              }
              throw error;
            } finally {
              activeSync = null;
              if (isCurrentSession()) set({ isSyncing: false });
            }
          })();
          return activeSync;
        },
        updateSettings: async (patch, syncWithServer = true) => {
          const startedAtGeneration = generation;
          const userId = useAuthStore.getState().userId;
          revision += 1;
          set({ ...patch, syncError: null });
          pendingMutations.push({
            id: createLocalId(),
            method: "PUT",
            path: "/settings",
            payload: api.toApiSettings(patch),
            createdAt: new Date().toISOString()
          });
          pendingWrites += 1;
          try {
            await persistPendingMutations();
          } catch (error) {
            if (generation === startedAtGeneration && useAuthStore.getState().userId === userId) {
              set({ syncError: error instanceof Error ? error.message : i18next.t("settings.syncError") });
            }
            throw error;
          } finally {
            pendingWrites -= 1;
          }

          if (generation !== startedAtGeneration || useAuthStore.getState().userId !== userId
            || !syncWithServer || useAuthStore.getState().isOfflineMode) return;
          if (activeSync && activeSyncGeneration === generation && activeSyncUserId === userId) {
            syncRequested = true;
          } else {
            void get().syncFromServer().catch(() => undefined);
          }
        },
        setBiometricLock: (enabled) => set({ biometricLockEnabled: enabled }),
        setBiometricLockTimeout: (timeout) => set({ biometricLockTimeout: timeout }),
      };
    },
    {
      name: "subtrack:settings",
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
