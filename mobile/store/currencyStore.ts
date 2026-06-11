import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import i18next from "@/lib/i18n";

export type CurrencyRates = {
  EUR: number;
  USD: number;
  GBP: number;
  CHF: number;
  PLN: number;
  HUF: number;
  JPY: number;
  CAD: number;
  AUD: number;
  SEK: number;
  NOK: number;
  DKK: number;
};

const DEFAULT_RATES: CurrencyRates = {
  EUR: 25.2,
  USD: 23.1,
  GBP: 29.4,
  CHF: 26.0,
  PLN: 5.7,
  HUF: 0.064,
  JPY: 0.155,
  CAD: 17.0,
  AUD: 15.1,
  SEK: 2.15,
  NOK: 2.10,
  DKK: 3.38,
};

const FETCH_CURRENCIES = "EUR,USD,GBP,CHF,PLN,HUF,JPY,CAD,AUD,SEK,NOK,DKK";

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
          const response = await fetch(`https://api.frankfurter.app/latest?from=CZK&to=${FETCH_CURRENCIES}`);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json() as { rates: Record<string, number> };
          const newRates = {} as Record<string, number>;
          for (const [key, val] of Object.entries(data.rates)) {
            newRates[key] = Math.round((1 / val) * 100) / 100;
          }
          set({
            rates: { ...DEFAULT_RATES, ...(newRates as CurrencyRates) },
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
  const inCZK = fromCurrency === "CZK" ? amount : amount * (rates[fromCurrency as keyof CurrencyRates] ?? 1);
  return toCurrency === "CZK" ? inCZK : inCZK / (rates[toCurrency as keyof CurrencyRates] ?? 1);
}
