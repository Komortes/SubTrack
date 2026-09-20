const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModule } = require("./loadModule.cjs");
const currencyStore = loadModule("store/currencyStore.ts", {
  "@react-native-async-storage/async-storage": {},
  "zustand/middleware": { persist: (creator) => creator, createJSONStorage: () => ({}) },
  "@/lib/i18n": { t: (key) => key },
});
const { convertMonthlyHistory } = loadModule("lib/analyticsHistory.ts", {
  "@/store/currencyStore": currencyStore,
});
const point = (patch = {}) => ({ key: "2026-05", label: "May", total: 110, ...patch });

test("monthly history converts currency subtotals before summing payments", () => {
  const raw = [point({ totalsByCurrency: { CZK: 100, USD: 10 } })];
  const rates = { ...currencyStore.useCurrencyStore.getState().rates, USD: 20, EUR: 25 };
  assert.equal(convertMonthlyHistory(raw, "CZK", rates)[0].total, 300);
  assert.equal(convertMonthlyHistory(raw, "EUR", rates)[0].total, 12);
  assert.equal(raw[0].total, 110);
});

test("legacy monthly sums without currency information are not presented as converted money", () => {
  assert.deepEqual(convertMonthlyHistory([point()], "CZK", currencyStore.useCurrencyStore.getState().rates), []);
});

test("empty month currency maps represent zero spending", () => {
  const result = convertMonthlyHistory([point({ totalsByCurrency: {} })], "EUR", currencyStore.useCurrencyStore.getState().rates);
  assert.equal(result[0].total, 0);
});

test("unknown or invalid currency data is not silently counted one-to-one", () => {
  const rates = currencyStore.useCurrencyStore.getState().rates;
  assert.deepEqual(convertMonthlyHistory([point({ totalsByCurrency: { UNKNOWN: 10 } })], "EUR", rates), []);
  assert.deepEqual(convertMonthlyHistory([point({ totalsByCurrency: { USD: NaN } })], "EUR", rates), []);
  assert.deepEqual(convertMonthlyHistory([point({ totalsByCurrency: { USD: 10 } })], "EUR", { ...rates, EUR: 0 }), []);
});
