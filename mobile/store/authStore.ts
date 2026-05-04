import * as SecureStore from "expo-secure-store";
import { create } from "zustand";

type AuthState = {
  email: string | null;
  isOfflineMode: boolean;
  setSession: (email: string, token: string) => Promise<void>;
  useOfflineMode: () => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  email: null,
  isOfflineMode: true,
  setSession: async (email, token) => {
    await SecureStore.setItemAsync("subtrack:token", token);
    set({ email, isOfflineMode: false });
  },
  useOfflineMode: () => set({ email: null, isOfflineMode: true }),
  logout: async () => {
    await SecureStore.deleteItemAsync("subtrack:token");
    set({ email: null, isOfflineMode: true });
  }
}));

