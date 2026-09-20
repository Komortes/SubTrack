const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModule } = require("./loadModule.cjs");

const subscription = (patch = {}) => ({
  id: "11111111-1111-4111-8111-111111111111", name: "Original", amount: 10,
  currency: "EUR", billingPeriod: "monthly", renewalDate: "2026-09-20",
  category: "work", color: "#000000", isActive: true, isArchived: false,
  isTrial: false, createdAt: "2026-09-01", ...patch,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise((resolve) => setImmediate(resolve));

test("offline renewals carry the payment UUID for idempotent server retries", async () => {
  const { store, queue } = setup({ offline: true });
  store.getState().setSubscriptions([subscription()]);
  await store.getState().markPaid(subscription().id);
  const payment = store.getState().subscriptions[0].paymentHistory[0];
  assert.equal(queue[0].payload?.payment_id, payment.id);
});

function setup({ offline = false, isPro = true, initialQueue = [], fetch, flush, enqueue } = {}) {
  const queue = [...initialQueue];
  const calls = [];
  const widgets = [];
  const reminders = [];
  const clearedReminders = [];
  const auth = { isOfflineMode: offline, userId: 1 };
  const direct = (method) => async (...args) => {
    calls.push(method);
    return subscription(args[1]);
  };
  const api = {
    toApiSubscription: (value) => value,
    createSubscription: direct("direct-create"), updateSubscription: direct("direct-update"),
    deleteSubscription: direct("direct-delete"), deleteAllSubscriptions: direct("direct-delete-all"),
    renewSubscription: direct("direct-renew"),
    fetchSubscription: async () => { calls.push("fetch-one"); return subscription(); },
    fetchSubscriptions: async () => { calls.push("fetch"); return fetch ? fetch() : []; },
  };
  const { useSubscriptionStore: store } = loadModule("store/subscriptionStore.ts", {
    "@react-native-async-storage/async-storage": {},
    "zustand/middleware": { persist: (creator) => creator, createJSONStorage: () => ({}) },
    "@/lib/api": api,
    "@/lib/i18n": { t: (key) => key },
    "@/lib/seed": { seedSubscriptions: [subscription()] },
    "@/store/authStore": { useAuthStore: { getState: () => auth } },
    "@/store/proStore": { useProStore: { getState: () => ({ isPro }) } },
    "@/store/settingsStore": { useSettingsStore: { getState: () => ({}) } },
    "@/lib/notifications": {
      syncLocalRenewalNotifications: async (items) => { reminders.push(items); },
      clearLocalRenewalNotifications: async () => { clearedReminders.push(true); },
    },
    "@/lib/widgetData": { updateWidgetData: async (items) => { widgets.push(items); } },
    "@/lib/subscriptionMath": { nextRenewalDate: () => "2026-10-20" },
    "@/lib/sync": {
      enqueueMutation: async (mutation) => {
        calls.push("enqueue");
        if (enqueue) await enqueue(mutation);
        queue.push(mutation);
      },
      getOfflineQueueSize: async () => queue.length,
      flushOfflineQueue: async () => {
        calls.push("flush");
        if (flush) await flush(queue);
        else queue.splice(0);
      },
    },
  });
  return { store, queue, calls, auth, api, widgets, reminders, clearedReminders };
}

test("a new install starts with an empty subscription list", () => {
  assert.deepEqual(setup().store.getState().subscriptions, []);
});

test("all offline mutations save locally and queue without contacting the API", async () => {
  const { store, calls, queue, widgets, reminders } = setup({ offline: true });
  const state = store.getState();
  state.setSubscriptions([subscription()]);
  await state.createSubscription(subscription({ id: undefined, name: "Created" }));
  await state.updateSubscription(subscription().id, { amount: 20 });
  await state.markPaid(subscription().id);
  await state.archiveSubscription(subscription().id);
  await state.importSubscriptions([subscription({ id: "imported" })]);
  await state.deleteSubscription(subscription().id);
  await state.deleteAllSubscriptions();
  await state.syncFromServer();
  await state.refreshSubscription("imported");
  await tick();

  assert.deepEqual(calls, Array(7).fill("enqueue"));
  assert.equal(queue.length, 7);
  assert.deepEqual(store.getState().subscriptions, []);
  assert.equal(store.getState().pendingSyncCount, 7);
  assert.deepEqual(widgets.at(-1), []);
  assert.deepEqual(reminders.at(-1), []);
  assert.equal(store.getState().syncError, null);
});

test("online edits enter the queue before synchronization and save without waiting for network", async () => {
  const network = deferred();
  const { store, calls, queue } = setup({ initialQueue: [{ id: "older-update" }], flush: () => network.promise });
  store.getState().setSubscriptions([subscription()]);
  let saved = false;
  const save = store.getState().updateSubscription(subscription().id, { name: "Latest" }).then(() => { saved = true; });
  await tick();
  assert.equal(saved, true);
  assert.equal(store.getState().subscriptions[0].name, "Latest");
  assert.deepEqual(calls, ["enqueue", "flush"]);
  assert.equal(queue[1].payload.name, "Latest");
  network.resolve();
  await save;
  await tick();
});

test("no network request starts before the mutation is durably queued", async () => {
  const storage = deferred();
  const { store, calls } = setup({ enqueue: () => storage.promise });
  const save = store.getState().createSubscription(subscription());
  await tick();
  assert.deepEqual(calls, ["enqueue"]);
  assert.equal(store.getState().subscriptions.length, 1);
  storage.resolve();
  await save;
  await tick();
  assert.equal(calls[1], "flush");
});

test("sync never fetches a stale server list while queued edits remain", async () => {
  const { store, calls } = setup({ initialQueue: [{ id: "pending" }], flush: async () => {} });
  store.getState().setSubscriptions([subscription({ name: "Local" })]);
  await store.getState().syncFromServer();
  assert.deepEqual(calls, ["flush"]);
  assert.equal(store.getState().subscriptions[0].name, "Local");
});

test("edits made during a server fetch are never overwritten by its response", async () => {
  const response = deferred();
  const { store, auth } = setup({ fetch: () => response.promise });
  store.getState().setSubscriptions([subscription()]);
  const sync = store.getState().syncFromServer();
  await tick();
  auth.isOfflineMode = true;
  await store.getState().updateSubscription(subscription().id, { name: "New local edit" });
  response.resolve([subscription({ name: "Stale server value" })]);
  await sync;
  assert.equal(store.getState().subscriptions[0].name, "New local edit");
});

test("concurrent sync callers share one queue flush and one fetch", async () => {
  const network = deferred();
  const { store, calls } = setup({ flush: () => network.promise });
  const first = store.getState().syncFromServer();
  const second = store.getState().syncFromServer();
  await tick();
  assert.deepEqual(calls, ["flush"]);
  network.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(calls, ["flush", "fetch"]);
});

test("detail refresh does not fetch over queued local changes", async () => {
  const { store, calls } = setup({ initialQueue: [{ id: "pending" }] });
  store.getState().setSubscriptions([subscription({ name: "Unsynced" })]);
  await store.getState().refreshSubscription(subscription().id);
  assert.deepEqual(calls, []);
  assert.equal(store.getState().subscriptions[0].name, "Unsynced");
});

test("markPaid(false) remains local-only and refreshes reminders and widget", async () => {
  const { store, calls, widgets, reminders } = setup({ offline: true });
  store.getState().setSubscriptions([subscription()]);
  await store.getState().markPaid(subscription().id, false);
  await tick();
  assert.deepEqual(calls, []);
  assert.equal(store.getState().subscriptions[0].renewalDate, "2026-10-20");
  assert.equal(store.getState().subscriptions[0].paymentHistory.length, 1);
  assert.equal(widgets.at(-1)[0].renewalDate, "2026-10-20");
  assert.equal(reminders.at(-1)[0].renewalDate, "2026-10-20");
});

test("online data changes clear local reminders instead of duplicating server push reminders", async () => {
  const { store, reminders, clearedReminders, widgets } = setup();
  store.getState().setSubscriptions([subscription()]);
  await tick();
  assert.deepEqual(reminders, []);
  assert.equal(clearedReminders.length, 1);
  assert.equal(widgets.length, 1);
});

test("a mutation during an online fetch requests another sync without accepting stale data", async () => {
  const response = deferred();
  let fetchCount = 0;
  const { store, calls } = setup({ fetch: () => ++fetchCount === 1
    ? response.promise : [subscription({ name: "Saved change" })] });
  store.getState().setSubscriptions([subscription()]);
  const sync = store.getState().syncFromServer();
  await tick();
  await store.getState().updateSubscription(subscription().id, { name: "Saved change" });
  response.resolve([subscription({ name: "Stale response" })]);
  await sync;
  assert.equal(store.getState().subscriptions[0].name, "Saved change");
  assert.deepEqual(calls, ["flush", "fetch", "enqueue", "flush", "fetch"]);
});

test("a delayed detail response cannot overwrite an edit made while it loaded", async () => {
  const response = deferred();
  const { store, api, auth } = setup();
  api.fetchSubscription = () => response.promise;
  store.getState().setSubscriptions([subscription()]);
  const refresh = store.getState().refreshSubscription(subscription().id);
  await tick();
  auth.isOfflineMode = true;
  await store.getState().updateSubscription(subscription().id, { amount: 30 });
  response.resolve(subscription());
  await refresh;
  assert.equal(store.getState().subscriptions[0].amount, 30);
});

test("collection refresh preserves payment history omitted by the list endpoint", async () => {
  const { store } = setup({ fetch: () => [subscription()] });
  const paymentHistory = [{ id: "payment", amount: 10 }];
  store.getState().setSubscriptions([subscription({ paymentHistory })]);
  await store.getState().syncFromServer();
  assert.deepEqual(store.getState().subscriptions[0].paymentHistory, paymentHistory);
});

test("reset during an in-flight flush cannot repopulate the cleared store", async () => {
  const network = deferred();
  const { store, calls } = setup({ flush: () => network.promise, fetch: () => [subscription()] });
  const sync = store.getState().syncFromServer();
  store.getState().resetSubscriptions();
  network.resolve();
  await sync;
  assert.deepEqual(store.getState().subscriptions, []);
  assert.deepEqual(calls, ["flush"]);
});

test("free users cannot restore or import past their limit but can create archives", async () => {
  const { store, queue } = setup({ offline: true, isPro: false });
  const active = Array.from({ length: 5 }, (_, index) => subscription({ id: `active-${index}` }));
  const archive = subscription({ id: "archive", isArchived: true });
  store.getState().setSubscriptions([...active, archive]);
  await assert.rejects(store.getState().updateSubscription("archive", { isArchived: false }), /FREE_LIMIT_REACHED/);
  await assert.rejects(store.getState().importSubscriptions([subscription({ id: "sixth" })]), /FREE_LIMIT_REACHED/);
  await store.getState().createSubscription(subscription({ isArchived: true }));
  assert.equal(store.getState().subscriptions.filter((item) => !item.isArchived).length, 5);
  assert.equal(queue.length, 1);
});

test("storage failures preserve edits and retry their queue entries before newer writes", async () => {
  let storageFailed = true;
  const { store, calls, queue } = setup({ offline: true, enqueue: async () => {
    if (storageFailed) throw new Error("Storage unavailable");
  } });
  store.getState().setSubscriptions([subscription()]);
  await assert.rejects(store.getState().updateSubscription(subscription().id, { name: "First edit" }), /Storage unavailable/);
  assert.equal(store.getState().subscriptions[0].name, "First edit");
  storageFailed = false;
  await store.getState().updateSubscription(subscription().id, { amount: 20 });
  assert.equal(queue[0].payload.name, "First edit");
  assert.equal(queue[1].payload.amount, 20);
  assert.deepEqual(calls, ["enqueue", "enqueue", "enqueue"]);
});

test("an edit arriving as a previous storage write settles is also durable before save resolves", async () => {
  const { store, queue } = setup({ offline: true });
  store.getState().setSubscriptions([subscription()]);
  const append = queue.push.bind(queue);
  let secondSave;
  queue.push = (mutation) => {
    const length = append(mutation);
    if (mutation.payload.name === "First") {
      queueMicrotask(() => queueMicrotask(() => {
        secondSave = store.getState().updateSubscription(subscription().id, { name: "Second" });
      }));
    }
    return length;
  };
  await store.getState().updateSubscription(subscription().id, { name: "First" });
  await tick();
  await secondSave;
  assert.equal(queue.length, 2);
  assert.equal(queue[1].payload.name, "Second");
});

for (const reset of [false, true]) {
  test(`a new account sync survives a previous account failure${reset ? " after reset" : " without reset"}`, async () => {
    const oldNetwork = deferred();
    let flushes = 0;
    const { store, auth, calls } = setup({
      flush: async () => {
        if (++flushes === 1) { await oldNetwork.promise; throw new Error("Old account failed"); }
      },
      fetch: () => [subscription({ name: "New account" })],
    });
    const oldSync = store.getState().syncFromServer().catch(() => {});
    await tick();
    if (reset) store.getState().resetSubscriptions();
    auth.userId = 2;
    const errors = [];
    const unsubscribe = store.subscribe((state) => { if (state.syncError) errors.push(state.syncError); });
    const newSync = store.getState().syncFromServer();
    oldNetwork.resolve();
    await Promise.all([oldSync, newSync]);
    unsubscribe();

    assert.deepEqual(errors, []);
    assert.equal(store.getState().subscriptions[0].name, "New account");
    assert.deepEqual(calls, ["flush", "flush", "fetch"]);
  });
}

test("reset followed by sync waits for the old successful request then loads the new account", async () => {
  const oldNetwork = deferred();
  let flushes = 0;
  const { store, auth, calls } = setup({
    flush: () => ++flushes === 1 ? oldNetwork.promise : undefined,
    fetch: () => [subscription({ name: "New account" })],
  });
  const oldSync = store.getState().syncFromServer();
  await tick();
  store.getState().resetSubscriptions();
  auth.userId = 2;
  const newSync = store.getState().syncFromServer();
  oldNetwork.resolve();
  await Promise.all([oldSync, newSync]);
  assert.equal(store.getState().subscriptions[0]?.name, "New account");
  assert.deepEqual(calls, ["flush", "flush", "fetch"]);
});
