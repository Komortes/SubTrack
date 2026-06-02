import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "@/lib/api";
import i18next from "@/lib/i18n";
import { clearStoredPushToken, getStoredPushToken } from "@/lib/notifications";
import { clearOfflineQueue } from "@/lib/sync";

const TOKEN_KEY = "subtrack_token";
const OFFLINE_MODE_KEY = "subtrack_offline_mode";

type AuthState = {
  email: string | null;
  isOfflineMode: boolean;
  isLoading: boolean;
  hasCheckedSession: boolean;
  hasCompletedOnboarding: boolean;
  error: string | null;
  clearError: () => void;
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  socialLogin: (provider: "google", idToken: string, name?: string | null) => Promise<void>;
  setSession: (email: string, token: string) => Promise<void>;
  useOfflineMode: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  isOfflineMode: true,
  isLoading: false,
  hasCheckedSession: false,
  hasCompletedOnboarding: false,
  error: null,
  clearError: () => set({ error: null }),
  restoreSession: async () => {
    set({ isLoading: true, error: null });
    const token = await SecureStore.getItemAsync(TOKEN_KEY);

    if (!token) {
      const offlineMode = (await SecureStore.getItemAsync(OFFLINE_MODE_KEY)) === "true";
      set({
        email: null,
        isOfflineMode: true,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: offlineMode
      });
      return;
    }

    try {
      const user = await api.me();
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      set({
        email: user.email,
        isOfflineMode: false,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: true
      });
    } catch {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      set({
        email: null,
        isOfflineMode: true,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: false
      });
    }
  },
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.login(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, session.token);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      set({
        email: session.user.email,
        isOfflineMode: false,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: true
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : i18next.t("common.error"), isLoading: false });
      throw error;
    }
  },
  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.register(email, password);
      await SecureStore.setItemAsync(TOKEN_KEY, session.token);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      set({
        email: session.user.email,
        isOfflineMode: false,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: true
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : i18next.t("common.error"), isLoading: false });
      throw error;
    }
  },
  socialLogin: async (provider, idToken, name) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.socialLogin(provider, idToken, name);
      await SecureStore.setItemAsync(TOKEN_KEY, session.token);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      set({
        email: session.user.email,
        isOfflineMode: false,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: true
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : i18next.t("common.error"), isLoading: false });
      throw error;
    }
  },
  setSession: async (email, token) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
    set({ email, isOfflineMode: false, hasCheckedSession: true, hasCompletedOnboarding: true, error: null });
  },
  useOfflineMode: async () => {
    await SecureStore.setItemAsync(OFFLINE_MODE_KEY, "true");
    set({ email: null, isOfflineMode: true, hasCheckedSession: true, hasCompletedOnboarding: true, error: null });
  },
  logout: async () => {
    try {
      const pushToken = await getStoredPushToken();
      if (pushToken) {
        await api.deletePushToken(pushToken);
      }
      await api.logout();
    } catch {
      // Local logout should still work if the backend is unavailable.
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
    await clearStoredPushToken();
    await clearOfflineQueue();
    set({ email: null, isOfflineMode: true, hasCheckedSession: true, hasCompletedOnboarding: false, error: null });
  },
  deleteAccount: async () => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteAccount();
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
      await clearStoredPushToken();
      await clearOfflineQueue();
      set({
        email: null,
        isOfflineMode: true,
        isLoading: false,
        hasCheckedSession: true,
        hasCompletedOnboarding: false,
        error: null
      });
    }
  }
}));
