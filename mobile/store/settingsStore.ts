import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import { enqueueMutation, flushOfflineQueue } from "@/lib/sync";
import i18next from "@/lib/i18n";

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
    (set) => ({
      ...defaults,
      isSyncing: false,
      syncError: null,
      biometricLockEnabled: false,
      biometricLockTimeout: 5 satisfies BiometricTimeout,
      resetSettings: () => set({ ...defaults, isSyncing: false, syncError: null, biometricLockEnabled: false, biometricLockTimeout: 5 satisfies BiometricTimeout }),
      syncFromServer: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          await flushOfflineQueue();
          const settings = await api.fetchSettings();
          set({ ...settings, isSyncing: false });
        } catch (error) {
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : i18next.t("settings.syncError")
          });
          throw error;
        }
      },
      updateSettings: async (patch, syncWithServer = true) => {
        set({ ...patch, syncError: null });

        if (!syncWithServer) {
          await enqueueMutation({
            id: createLocalId(),
            method: "PUT",
            path: "/settings",
            payload: api.toApiSettings(patch),
            createdAt: new Date().toISOString()
          });
          return;
        }

        try {
          const settings = await api.updateSettings(patch);
          set({ ...settings, syncError: null });
        } catch (error) {
          await enqueueMutation({
            id: createLocalId(),
            method: "PUT",
            path: "/settings",
            payload: api.toApiSettings(patch),
            createdAt: new Date().toISOString()
          });
          set({
            syncError: error instanceof Error ? `${error.message}. ${i18next.t("settings.syncError")}` : i18next.t("settings.syncError")
          });
        }
      },
      setBiometricLock: (enabled) => set({ biometricLockEnabled: enabled }),
      setBiometricLockTimeout: (timeout) => set({ biometricLockTimeout: timeout }),
    }),
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
