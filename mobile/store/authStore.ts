import * as SecureStore from "expo-secure-store";
import { create } from "zustand";
import * as api from "@/lib/api";
import i18next from "@/lib/i18n";
import { clearStoredPushToken, getStoredPushToken } from "@/lib/notifications";
import { clearOfflineQueue } from "@/lib/sync";

const TOKEN_KEY = "subtrack_token";
const OFFLINE_MODE_KEY = "subtrack_offline_mode";
const DATA_OWNER_KEY = "subtrack_data_owner";
const UNKNOWN_OWNER = "unknown";

type AuthState = {
  email: string | null;
  userId: number | null;
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

export const useAuthStore = create<AuthState>((set, get) => {
  let sessionVersion = 0;
  let sessionChange: Promise<void> = Promise.resolve();
  const serializeSessionChange = (change: () => Promise<void>) => {
    const pending = sessionChange.then(change);
    sessionChange = pending.catch(() => undefined);
    return pending;
  };
  const offlineState = {
    email: null,
    userId: null,
    isOfflineMode: true,
    isLoading: false,
    hasCheckedSession: true
  };

  const activateSession = (user: { id: number; email: string }, version: number, token?: string) => serializeSessionChange(async () => {
    if (version !== sessionVersion) return;
    const storedOwner = await SecureStore.getItemAsync(DATA_OWNER_KEY);
    const owner = storedOwner ?? (get().userId !== null ? String(get().userId) : null);
    const previousToken = await SecureStore.getItemAsync(TOKEN_KEY);
    // A verified restore identifies legacy data by its existing token. A new
    // login cannot assume legacy signed-in data belongs to the next account.
    const verifiedLegacyRestore = token === undefined && (owner === null || owner === UNKNOWN_OWNER);
    const differentOwner = owner !== null && owner !== String(user.id) && !verifiedLegacyRestore;
    const unidentifiedPreviousAccount = owner === null && previousToken !== null && token !== undefined;

    if (version !== sessionVersion) return;
    set({ isOfflineMode: true });
    if (differentOwner || unidentifiedPreviousAccount) {
      await resetLocalData();
      await clearStoredPushToken().catch(() => undefined);
    }
    if (version !== sessionVersion) return;
    await SecureStore.setItemAsync(DATA_OWNER_KEY, String(user.id));
    if (token !== undefined) await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
    if (version !== sessionVersion) return;
    set({
      email: user.email,
      userId: user.id,
      isOfflineMode: false,
      isLoading: false,
      hasCheckedSession: true,
      hasCompletedOnboarding: true,
      error: null
    });
  });

  const authenticate = async (request: () => Promise<{ user: { id: number; email: string }; token: string }>) => {
    const version = ++sessionVersion;
    set({ isLoading: true, error: null });
    try {
      if (!await secureStorageAvailable()) throw new Error(i18next.t("common.error"));
      if (version !== sessionVersion) return;
      const session = await request();
      await activateSession(session.user, version, session.token);
    } catch (error) {
      if (version === sessionVersion) {
        set({ error: error instanceof Error ? error.message : i18next.t("common.error"), isLoading: false });
      }
      throw error;
    }
  };

  const clearSession = (version: number) => serializeSessionChange(async () => {
    if (version !== sessionVersion) return;
    set({ ...offlineState, hasCompletedOnboarding: false, error: null });
    const available = await secureStorageAvailable();
    if (available) {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(OFFLINE_MODE_KEY);
    }
    await resetLocalData();
    await clearStoredPushToken().catch(() => undefined);
    // Retain the owner if data cleanup fails, so a later login still isolates it.
    if (available) await SecureStore.deleteItemAsync(DATA_OWNER_KEY);
  });

  return {
    email: null,
    userId: null,
    isOfflineMode: true,
    isLoading: false,
    hasCheckedSession: false,
    hasCompletedOnboarding: false,
    error: null,
    clearError: () => set({ error: null }),
    restoreSession: async () => {
      const version = ++sessionVersion;
      set({ isLoading: true, error: null });
      if (!await secureStorageAvailable()) {
        if (version === sessionVersion) set({ ...offlineState, hasCompletedOnboarding: true });
        return;
      }
      if (version !== sessionVersion) return;

      let token: string | null = null;
      let owner: string | null = null;
      try {
        token = await SecureStore.getItemAsync(TOKEN_KEY);
        owner = await SecureStore.getItemAsync(DATA_OWNER_KEY);
        if (version !== sessionVersion) return;
        if (!token) {
          const offlineMode = (await SecureStore.getItemAsync(OFFLINE_MODE_KEY)) === "true";
          if (version === sessionVersion) set({ ...offlineState, hasCompletedOnboarding: offlineMode || owner !== null });
          return;
        }
        const user = await api.me();
        await activateSession(user, version);
      } catch (error) {
        await serializeSessionChange(async () => {
          if (version !== sessionVersion) return;
          if (token && !owner) {
            // Preserve legacy account ownership even when identity lookup fails.
            await SecureStore.setItemAsync(DATA_OWNER_KEY, UNKNOWN_OWNER).catch(() => undefined);
          }
          if (error instanceof api.ApiError && error.status === 401) {
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
          }
          if (version === sessionVersion) set({
            ...offlineState,
            hasCompletedOnboarding: true,
            error: error instanceof Error ? error.message : i18next.t("common.error")
          });
        });
      }
    },
    login: (email, password) => authenticate(() => api.login(email, password)),
    register: (email, password) => authenticate(() => api.register(email, password)),
    socialLogin: (provider, idToken, name) => authenticate(() => api.socialLogin(provider, idToken, name)),
    setSession: (_email, token) => authenticate(async () => ({
      user: await api.apiRequest<{ id: number; email: string }>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      token
    })),
    useOfflineMode: async () => {
      const version = ++sessionVersion;
      if (await secureStorageAvailable()) await SecureStore.setItemAsync(OFFLINE_MODE_KEY, "true");
      if (version === sessionVersion) set({ ...offlineState, hasCompletedOnboarding: true, error: null });
    },
    logout: async () => {
      const version = ++sessionVersion;
      set({ isOfflineMode: true, isLoading: true });
      try {
        const pushToken = await getStoredPushToken();
        if (version !== sessionVersion) return;
        if (pushToken) await api.deletePushToken(pushToken);
        if (version !== sessionVersion) return;
        await api.logout();
      } catch {
        // Local logout should still work if the backend is unavailable.
      }
      await clearSession(version);
    },
    deleteAccount: async () => {
      const version = ++sessionVersion;
      set({ isLoading: true, error: null });
      try {
        await api.deleteAccount();
        await clearSession(version);
      } catch (error) {
        if (version === sessionVersion) {
          set({ isLoading: false, error: error instanceof Error ? error.message : i18next.t("common.error") });
        }
        throw error;
      }
    }
  };
});

async function secureStorageAvailable(): Promise<boolean> {
  return SecureStore.isAvailableAsync().catch(() => false);
}

async function resetLocalData(): Promise<void> {
  // Load lazily because both persisted stores also read the current auth state.
  const [{ useSubscriptionStore }, { useSettingsStore }] = await Promise.all([
    import("@/store/subscriptionStore"),
    import("@/store/settingsStore")
  ]);
  await Promise.all([
    useSubscriptionStore.persist && !useSubscriptionStore.persist.hasHydrated()
      ? useSubscriptionStore.persist.rehydrate() : undefined,
    useSettingsStore.persist && !useSettingsStore.persist.hasHydrated()
      ? useSettingsStore.persist.rehydrate() : undefined
  ]);
  useSubscriptionStore.getState().resetSubscriptions();
  useSettingsStore.getState().resetSettings();
  await clearOfflineQueue();
  await Promise.all([
    useSubscriptionStore.persist?.clearStorage(),
    useSettingsStore.persist?.clearStorage()
  ]);
}
