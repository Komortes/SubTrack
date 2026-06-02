import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18next from "@/lib/i18n";

export type CurrencyRates = {
  EUR: number; // 1 EUR = X CZK
  USD: number; // 1 USD = X CZK
};

const DEFAULT_RATES: CurrencyRates = {
  EUR: 25.2,
  USD: 23.1
};

type CurrencyState = {
  rates: CurrencyRates;
  lastUpdated: string | null;
  isFetching: boolean;
  fetchError: string | null;
  fetchRates: (force?: boolean) => Promise<void>;
  setRate: (currency: keyof CurrencyRates, value: number) => void;
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set, get) => ({
      rates: DEFAULT_RATES,
      lastUpdated: null,
      isFetching: false,
      fetchError: null,

      fetchRates: async (force?: boolean) => {
        const { lastUpdated, isFetching } = get();

        if (isFetching) return;

        if (!force && lastUpdated) {
          const age = Date.now() - new Date(lastUpdated).getTime();
          if (age < 24 * 60 * 60 * 1000) return;
        }

        set({ isFetching: true, fetchError: null });
        try {
          const response = await fetch("https://api.frankfurter.app/latest?from=CZK&to=EUR,USD");
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json() as { rates: { EUR: number; USD: number } };
          // frankfurter returns how many EUR/USD per 1 CZK, we need inverse
          set({
            rates: {
              EUR: Math.round((1 / data.rates.EUR) * 100) / 100,
              USD: Math.round((1 / data.rates.USD) * 100) / 100
            },
            lastUpdated: new Date().toISOString(),
            isFetching: false,
            fetchError: null
          });
        } catch {
          set({ isFetching: false, fetchError: i18next.t("common.error") });
        }
      },

      setRate: (currency, value) => {
        set((state) => ({
          rates: { ...state.rates, [currency]: value },
          lastUpdated: new Date().toISOString()
        }));
      }
    }),
    {
      name: "subtrack:currency",
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: CurrencyRates
): number {
  if (fromCurrency === toCurrency) return amount;
  // Convert to CZK first (base currency)
  const inCZK = fromCurrency === "CZK" ? amount : amount * (rates[fromCurrency as keyof CurrencyRates] ?? 1);
  // Convert from CZK to target
  return toCurrency === "CZK" ? inCZK : inCZK / (rates[toCurrency as keyof CurrencyRates] ?? 1);
}
