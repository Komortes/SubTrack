import { Platform } from "react-native";
import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { create } from "zustand";
import i18next from "@/lib/i18n";

type ProStore = {
  isPro: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  error: string | null;
  isConfigured: boolean;
  initialize: (userId?: number | null) => Promise<void>;
  syncUser: (userId: number | null) => Promise<void>;
  refresh: () => Promise<void>;
  purchase: (packageIdentifier: string) => Promise<void>;
  restore: () => Promise<void>;
  _handleCustomerInfo: (info: CustomerInfo) => void;
};

const RC_KEY = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
});

export const useProStore = create<ProStore>()((set, get) => ({
  isPro: false,
  isLoading: true,
  offering: null,
  error: null,
  isConfigured: false,

  initialize: async (userId) => {
    if (!RC_KEY) {
      // No RevenueCat key configured for this platform yet (e.g. Android key
      // pending account setup) — fail soft instead of calling the SDK with an
      // empty key, which would crash.
      console.warn(`RevenueCat: no API key configured for platform "${Platform.OS}", skipping init.`);
      set({ isLoading: false });
      return;
    }

    try {
      Purchases.configure({ apiKey: RC_KEY, appUserID: userId ? String(userId) : undefined });
      set({ isConfigured: true });
      const info = await Purchases.getCustomerInfo();
      get()._handleCustomerInfo(info);
      const offerings = await Purchases.getOfferings();
      set({ offering: offerings.current, isLoading: false });

      Purchases.addCustomerInfoUpdateListener((info) => {
        get()._handleCustomerInfo(info);
      });
    } catch {
      set({ isLoading: false });
    }
  },

  // Call whenever the logged-in user changes (login/logout) so purchase
  // history and entitlements stay attached to the right RevenueCat identity
  // instead of leaking between accounts on a shared device.
  syncUser: async (userId) => {
    if (!get().isConfigured) return;
    try {
      const info = userId ? (await Purchases.logIn(String(userId))).customerInfo : await Purchases.logOut();
      get()._handleCustomerInfo(info);
    } catch {
      // non-fatal — next getCustomerInfo/refresh call will retry the sync
    }
  },

  refresh: async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      get()._handleCustomerInfo(info);
    } catch {
      // non-fatal
    }
  },

  purchase: async (packageIdentifier: string) => {
    const { offering } = get();
    if (!offering) throw new Error(i18next.t("paywall.error"));
    const pkg = offering.availablePackages.find((p) => p.identifier === packageIdentifier);
    if (!pkg) throw new Error(i18next.t("paywall.error"));
    set({ error: null });
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      get()._handleCustomerInfo(customerInfo);
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) return;
      set({ error: i18next.t("paywall.purchaseError") });
      throw e;
    }
  },

  restore: async () => {
    set({ error: null });
    let info: CustomerInfo;
    try {
      info = await Purchases.restorePurchases();
    } catch (e: unknown) {
      set({ error: i18next.t("paywall.purchaseError") });
      throw e;
    }

    get()._handleCustomerInfo(info);
    const isPro = !!info.entitlements.active["pro"];
    if (!isPro) {
      // Distinct from a failed API call: the restore succeeded but found no
      // active "pro" entitlement for this account.
      const error = new Error(i18next.t("paywall.restoreError"));
      set({ error: error.message });
      throw error;
    }
  },

  _handleCustomerInfo: (info: CustomerInfo) => {
    const isPro = !!info.entitlements.active["pro"];
    set({ isPro });
  },
}));
