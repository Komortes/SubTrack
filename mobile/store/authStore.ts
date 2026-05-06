import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "@/lib/api";

type AuthState = {
  email: string | null;
  isOfflineMode: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  setSession: (email: string, token: string) => Promise<void>;
  useOfflineMode: () => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  isOfflineMode: true,
  isLoading: false,
  error: null,
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.login(email, password);
      await SecureStore.setItemAsync("subtrack_token", session.token);
      set({ email: session.user.email, isOfflineMode: false, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Не удалось войти", isLoading: false });
      throw error;
    }
  },
  register: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await api.register(email, password);
      await SecureStore.setItemAsync("subtrack_token", session.token);
      set({ email: session.user.email, isOfflineMode: false, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Не удалось зарегистрироваться", isLoading: false });
      throw error;
    }
  },
  setSession: async (email, token) => {
    await SecureStore.setItemAsync("subtrack_token", token);
    set({ email, isOfflineMode: false, error: null });
  },
  useOfflineMode: () => set({ email: null, isOfflineMode: true, error: null }),
  logout: async () => {
    try {
      await api.logout();
    } catch {
      // Local logout should still work if the backend is unavailable.
    }
    await SecureStore.deleteItemAsync("subtrack_token");
    set({ email: null, isOfflineMode: true, error: null });
  }
}));
