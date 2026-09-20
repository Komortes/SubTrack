const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModule } = require("./loadModule.cjs");
const tick = () => new Promise((resolve) => setImmediate(resolve));
const point = { key: "2026-05", label: "May", total: 10, totalsByCurrency: { CZK: 10 } };

function setup({ offline = false, syncedAt = "first-sync", pending = 0, syncing = false, fetchMonthly } = {}) {
  const stateValues = [];
  const effects = [];
  let stateCursor = 0;
  let effectCursor = 0;
  const calls = { monthly: 0, summary: 0, rates: 0 };
  const auth = { isOfflineMode: offline, userId: 1 };
  const subscriptions = {
    subscriptions: [], lastSyncedAt: syncedAt, pendingSyncCount: pending, isSyncing: syncing, syncError: null,
  };
  const currency = { rates: {}, fetchRates: async () => { calls.rates += 1; } };
  const store = (state) => Object.assign((selector) => selector(state), { getState: () => state });
  const { useAnalytics } = loadModule("hooks/useAnalytics.ts", {
    "react": {
      useMemo: (create) => create(),
      useState: (initial) => {
        const index = stateCursor++;
        if (!(index in stateValues)) stateValues[index] = initial;
        return [stateValues[index], (value) => {
          stateValues[index] = typeof value === "function" ? value(stateValues[index]) : value;
        }];
      },
      useEffect: (callback, dependencies) => {
        const index = effectCursor++;
        const previous = effects[index];
        if (!previous || dependencies.some((value, key) => !Object.is(value, previous.dependencies[key]))) {
          previous?.cleanup?.();
          effects[index] = { dependencies, callback, needsRun: true };
        }
      },
    },
    "@/lib/api": {
      fetchMonthlyAnalytics: async () => { calls.monthly += 1; return fetchMonthly ? fetchMonthly() : [point]; },
      fetchAnalyticsSummary: async () => { calls.summary += 1; return {}; },
    },
    "@/lib/i18n": { t: (key) => key },
    "@/lib/analyticsHistory": { convertMonthlyHistory: (points) => points },
    "@/lib/subscriptionMath": { normalizeMonthlyAmount: (item) => item.amount },
    "@/store/authStore": { useAuthStore: store(auth) },
    "@/store/subscriptionStore": { useSubscriptionStore: store(subscriptions) },
    "@/store/settingsStore": { useSettingsStore: store({ primaryCurrency: "CZK" }) },
    "@/store/currencyStore": { useCurrencyStore: store(currency), convertAmount: (amount) => amount },
  });
  const RenderAnalytics = () => {
    stateCursor = 0;
    effectCursor = 0;
    const result = useAnalytics();
    effects.forEach((effect) => {
      if (effect.needsRun) {
        effect.needsRun = false;
        effect.cleanup = effect.callback();
      }
    });
    return result;
  };
  return { calls, auth, subscriptions, render: RenderAnalytics };
}

test("analytics performs no requests in explicit offline mode", async () => {
  const { render, calls } = setup({ offline: true });
  render();
  await tick();
  assert.deepEqual(calls, { monthly: 0, summary: 0, rates: 0 });
});

for (const [name, options] of Object.entries({
  "initial subscription sync": { syncedAt: null },
  "queued edits": { pending: 1 },
  "an in-flight sync": { syncing: true },
})) {
  test(`monthly history waits for ${name}`, async () => {
    const { render, calls } = setup(options);
    render();
    await tick();
    assert.equal(calls.monthly, 0);
    assert.equal(calls.summary, 0);
  });
}

test("a successful sync refreshes payment history even when subscription count is unchanged", async () => {
  const { render, calls, subscriptions } = setup();
  render();
  await tick();
  subscriptions.lastSyncedAt = "second-sync";
  render();
  await tick();
  assert.equal(calls.monthly, 2);
  assert.equal(calls.summary, 0);
});

test("a monthly response from a previous user is never shown after switching accounts", async () => {
  let resolve;
  const response = new Promise((done) => { resolve = done; });
  const { render, auth } = setup({ fetchMonthly: () => response });
  render();
  auth.userId = 2;
  resolve([point]);
  await tick();
  assert.deepEqual(render().monthlyHistory, []);
});

test("a monthly response cannot replace history while local edits are awaiting sync", async () => {
  let resolve;
  const response = new Promise((done) => { resolve = done; });
  const { render, subscriptions } = setup({ fetchMonthly: () => response });
  render();
  subscriptions.subscriptions = [{ amount: 20, isActive: false }];
  resolve([point]);
  await tick();
  assert.deepEqual(render().monthlyHistory, []);
});
