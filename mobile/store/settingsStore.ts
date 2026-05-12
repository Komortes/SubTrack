import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import * as api from "@/lib/api";
import { enqueueMutation, flushOfflineQueue } from "@/lib/sync";

type SettingsState = api.UserSettings & {
  isSyncing: boolean;
  syncError: string | null;
  resetSettings: () => void;
  syncFromServer: () => Promise<void>;
  updateSettings: (patch: Partial<api.UserSettings>, syncWithServer?: boolean) => Promise<void>;
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
      resetSettings: () => set({ ...defaults, isSyncing: false, syncError: null }),
      syncFromServer: async () => {
        set({ isSyncing: true, syncError: null });
        try {
          await flushOfflineQueue();
          const settings = await api.fetchSettings();
          set({ ...settings, isSyncing: false });
        } catch (error) {
          set({
            isSyncing: false,
            syncError: error instanceof Error ? error.message : "Не удалось синхронизировать настройки"
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
            syncError: error instanceof Error ? `${error.message}. Настройки сохранены локально` : "Настройки сохранены локально"
          });
        }
      }
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
