import Purchases, { CustomerInfo, PurchasesOffering } from "react-native-purchases";
import { create } from "zustand";
import i18next from "@/lib/i18n";

type ProStore = {
  isPro: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  error: string | null;
  initialize: () => Promise<void>;
  refresh: () => Promise<void>;
  purchase: (packageIdentifier: string) => Promise<void>;
  restore: () => Promise<void>;
  _handleCustomerInfo: (info: CustomerInfo) => void;
};

const RC_IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? "";

export const useProStore = create<ProStore>()((set, get) => ({
  isPro: false,
  isLoading: true,
  offering: null,
  error: null,

  initialize: async () => {
    try {
      Purchases.configure({ apiKey: RC_IOS_KEY });
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
    try {
      const info = await Purchases.restorePurchases();
      get()._handleCustomerInfo(info);
      const isPro = !!info.entitlements.active["pro"];
      if (!isPro) throw new Error(i18next.t("paywall.restoreError"));
    } catch (e: unknown) {
      const msg = (e as Error).message;
      if (msg === i18next.t("paywall.restoreError")) throw e;
      set({ error: i18next.t("paywall.purchaseError") });
      throw e;
    }
  },

  _handleCustomerInfo: (info: CustomerInfo) => {
    const isPro = !!info.entitlements.active["pro"];
    set({ isPro });
  },
}));
