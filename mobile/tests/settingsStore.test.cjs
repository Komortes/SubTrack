const assert = require("node:assert/strict");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { loadModule } = require("./loadModule.cjs");

const settings = (patch = {}) => ({
  notifyThreeDays: true, notifyOneDay: true, notifySameDay: true,
  notificationTime: "09:00", primaryCurrency: "CZK", dateFormat: "DD.MM.YYYY",
  theme: "system", ...patch,
});
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};

function setup({ offline = false, initialQueue = [], fetch, flush, enqueue } = {}) {
  const queue = [...initialQueue];
  const calls = [];
  const auth = { isOfflineMode: offline, userId: 1 };
  const { useSettingsStore: store } = loadModule("store/settingsStore.ts", {
    "@react-native-async-storage/async-storage": {},
    "zustand/middleware": { persist: (creator) => creator, createJSONStorage: () => ({}) },
    "@/lib/i18n": { t: (key) => key },
    "@/store/authStore": { useAuthStore: { getState: () => auth } },
    "@/lib/api": {
      toApiSettings: (patch) => patch,
      updateSettings: async (patch) => { calls.push("direct-update"); return settings(patch); },
      fetchSettings: async () => { calls.push("fetch"); return fetch ? fetch() : settings(); },
    },
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
  return { store, queue, calls, auth };
}

test("settings save durably before background sync without waiting for network", async () => {
  const network = deferred();
  const { store, queue, calls } = setup({ flush: () => network.promise });
  let saved = false;
  const save = store.getState().updateSettings({ theme: "dark" }).then(() => { saved = true; });
  await nextTurn();
  try {
    assert.equal(saved, true);
    assert.equal(store.getState().theme, "dark");
    assert.deepEqual(calls, ["enqueue", "flush"]);
    assert.equal(queue[0].payload.theme, "dark");
  } finally {
    network.resolve();
    await save;
    await nextTurn();
  }
});

test("explicit offline mode queues settings even when the caller uses default sync options", async () => {
  const { store, calls } = setup({ offline: true });
  await store.getState().updateSettings({ primaryCurrency: "EUR" });
  await store.getState().syncFromServer();
  assert.deepEqual(calls, ["enqueue"]);
  assert.equal(store.getState().primaryCurrency, "EUR");
});

test("a delayed settings response cannot overwrite a newer local preference", async () => {
  const response = deferred();
  const { store } = setup({ fetch: () => response.promise });
  const sync = store.getState().syncFromServer();
  await nextTurn();
  await store.getState().updateSettings({ theme: "dark" }, false);
  response.resolve(settings({ theme: "light" }));
  await sync;
  assert.equal(store.getState().theme, "dark");
});

test("settings refresh never fetches over remaining queued mutations", async () => {
  const { store, calls } = setup({ initialQueue: [{ id: "pending" }], flush: async () => {} });
  await store.getState().syncFromServer();
  assert.deepEqual(calls, ["flush"]);
});

test("concurrent settings sync callers share one flush and fetch", async () => {
  const network = deferred();
  const { store, calls } = setup({ flush: () => network.promise });
  const first = store.getState().syncFromServer();
  const second = store.getState().syncFromServer();
  await nextTurn();
  network.resolve();
  await Promise.all([first, second]);
  assert.deepEqual(calls, ["flush", "fetch"]);
});

test("reset while settings are loading prevents the old account response from restoring preferences", async () => {
  const response = deferred();
  const { store } = setup({ fetch: () => response.promise });
  const sync = store.getState().syncFromServer();
  await nextTurn();
  store.getState().resetSettings();
  response.resolve(settings({ theme: "dark" }));
  await sync;
  assert.equal(store.getState().theme, "system");
});

test("a new preference during an online fetch triggers another sync and rejects the stale snapshot", async () => {
  const response = deferred();
  let fetchCount = 0;
  const { store, calls } = setup({ fetch: () => ++fetchCount === 1
    ? response.promise : settings({ theme: "dark" }) });
  const sync = store.getState().syncFromServer();
  await nextTurn();
  await store.getState().updateSettings({ theme: "dark" });
  response.resolve(settings({ theme: "light" }));
  await sync;
  assert.equal(store.getState().theme, "dark");
  assert.deepEqual(calls, ["flush", "fetch", "enqueue", "flush", "fetch"]);
});

test("settings whose storage write failed retry before newer preferences", async () => {
  let unavailable = true;
  const { store, queue } = setup({ offline: true, enqueue: async () => {
    if (unavailable) throw new Error("Storage unavailable");
  } });
  await assert.rejects(store.getState().updateSettings({ theme: "dark" }, false), /Storage unavailable/);
  assert.equal(store.getState().theme, "dark");
  unavailable = false;
  await store.getState().updateSettings({ notificationTime: "10:30" }, false);
  assert.deepEqual(queue.map((entry) => entry.payload), [{ theme: "dark" }, { notificationTime: "10:30" }]);
});

for (const reset of [false, true]) {
  test(`new account settings sync survives old request failure${reset ? " after reset" : " without reset"}`, async () => {
    const oldNetwork = deferred();
    let flushes = 0;
    const { store, auth, calls } = setup({
      flush: async () => {
        if (++flushes === 1) { await oldNetwork.promise; throw new Error("Old account failed"); }
      },
      fetch: () => settings({ theme: "dark" }),
    });
    const oldSync = store.getState().syncFromServer().catch(() => {});
    await nextTurn();
    if (reset) store.getState().resetSettings();
    auth.userId = 2;
    const errors = [];
    const unsubscribe = store.subscribe((state) => { if (state.syncError) errors.push(state.syncError); });
    const newSync = store.getState().syncFromServer();
    oldNetwork.resolve();
    await Promise.all([oldSync, newSync]);
    unsubscribe();

    assert.deepEqual(errors, []);
    assert.equal(store.getState().theme, "dark");
    assert.deepEqual(calls, ["flush", "flush", "fetch"]);
  });
}

test("reset settings sync waits for the old successful request then refreshes the new account", async () => {
  const oldNetwork = deferred();
  let flushes = 0;
  const { store, auth, calls } = setup({
    flush: () => ++flushes === 1 ? oldNetwork.promise : undefined,
    fetch: () => settings({ theme: "dark" }),
  });
  const oldSync = store.getState().syncFromServer();
  await nextTurn();
  store.getState().resetSettings();
  auth.userId = 2;
  const newSync = store.getState().syncFromServer();
  oldNetwork.resolve();
  await Promise.all([oldSync, newSync]);
  assert.equal(store.getState().theme, "dark");
  assert.deepEqual(calls, ["flush", "flush", "fetch"]);
});
