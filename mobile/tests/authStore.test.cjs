const assert = require("node:assert/strict");
const { test } = require("node:test");
const { loadModule } = require("./loadModule.cjs");

const TOKEN = "subtrack_token";
const OWNER = "subtrack_data_owner";
const OFFLINE = "subtrack_offline_mode";
class ApiError extends Error {
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}

function setup({ owner = "1", token = "previous-token", available = true, meError, meResponse, deleteError, userId = 2 } = {}) {
  const storage = new Map();
  if (owner !== null) storage.set(OWNER, owner);
  if (token !== null) storage.set(TOKEN, token);
  const calls = [];
  const queue = [{ id: "previous-account-edit" }];
  const data = { subscriptions: ["Private subscription"], settings: { theme: "dark" } };
  const session = { user: { id: userId, email: `user${userId}@example.com` }, token: "new-token" };
  const unavailable = () => { if (!available) throw new Error("SecureStore unavailable"); };
  const { useAuthStore: store } = loadModule("store/authStore.ts", {
    "expo-secure-store": {
      isAvailableAsync: async () => available,
      getItemAsync: async (key) => { unavailable(); return storage.get(key) ?? null; },
      setItemAsync: async (key, value) => { unavailable(); calls.push(`write:${key}`); storage.set(key, value); },
      deleteItemAsync: async (key) => { unavailable(); calls.push(`delete:${key}`); storage.delete(key); },
    },
    "@/lib/api": {
      ApiError,
      login: async () => session,
      register: async () => session,
      socialLogin: async () => session,
      me: async () => { calls.push("me"); if (meError) throw meError; return meResponse ?? session.user; },
      apiRequest: async (path, options) => {
        calls.push("identify-session");
        assert.equal(path, "/auth/me");
        assert.equal(options.headers.Authorization, "Bearer new-token");
        assert.equal(storage.get(TOKEN), token ?? undefined);
        return session.user;
      },
      logout: async () => { calls.push("logout"); },
      deleteAccount: async () => { calls.push("delete-account"); if (deleteError) throw deleteError; },
      deletePushToken: async () => {},
    },
    "@/lib/i18n": { t: (key) => key },
    "@/lib/notifications": {
      getStoredPushToken: async () => null,
      clearStoredPushToken: async () => { calls.push("clear-push"); },
    },
    "@/lib/sync": { clearOfflineQueue: async () => { calls.push("clear-queue"); queue.splice(0); } },
    "@/store/subscriptionStore": { useSubscriptionStore: { getState: () => ({ resetSubscriptions: () => {
      calls.push("reset-subscriptions"); data.subscriptions = [];
    } }) } },
    "@/store/settingsStore": { useSettingsStore: { getState: () => ({ resetSettings: () => {
      calls.push("reset-settings"); data.settings = {};
    } }) } },
  });
  return { store, storage, calls, queue, data };
}

for (const method of ["login", "register", "socialLogin", "setSession"]) {
  test(`${method} isolates the previous owner's data before installing another account`, async () => {
    const { store, storage, calls, queue, data } = setup();
    if (method === "setSession") await store.getState().setSession("untrusted@example.com", "new-token");
    else if (method === "socialLogin") await store.getState().socialLogin("google", "identity-token");
    else await store.getState()[method]("user2@example.com", "password");
    assert.deepEqual(queue, []);
    assert.deepEqual(data.subscriptions, []);
    assert.deepEqual(data.settings, {});
    assert.equal(storage.get(OWNER), "2");
    assert.ok(calls.indexOf("clear-queue") < calls.indexOf(`write:${TOKEN}`));
    assert.equal(store.getState().userId, 2);
    assert.equal(store.getState().email, "user2@example.com");
  });
}

for (const owner of [null, "2"]) {
  test(`signing in preserves ${owner === null ? "unowned guest" : "the same owner's"} edits`, async () => {
    const { store, storage, queue, data } = setup({ owner, token: owner ? "previous-token" : null });
    await store.getState().login("user2@example.com", "password");
    assert.equal(queue.length, 1);
    assert.equal(data.subscriptions.length, 1);
    assert.equal(storage.get(OWNER), "2");
  });
}

for (const status of [0, 500]) {
  test(`session restore preserves credentials and offline access after HTTP ${status}`, async () => {
    const { store, storage, queue } = setup({ meError: new ApiError(status) });
    await store.getState().restoreSession();
    assert.equal(storage.get(TOKEN), "previous-token");
    assert.equal(storage.get(OWNER), "1");
    assert.equal(queue.length, 1);
    assert.equal(store.getState().isOfflineMode, true);
    assert.equal(store.getState().hasCompletedOnboarding, true);
    assert.equal(store.getState().hasCheckedSession, true);
  });
}

test("an expired token is removed without discarding its data owner or pending edits", async () => {
  const { store, storage, queue } = setup({ meError: new ApiError(401) });
  await store.getState().restoreSession();
  assert.equal(storage.has(TOKEN), false);
  assert.equal(storage.get(OWNER), "1");
  assert.equal(queue.length, 1);
  assert.equal(store.getState().hasCompletedOnboarding, true);
});

test("legacy account data is not mistaken for an unowned guest after a failed restore", async () => {
  const { store, storage, queue } = setup({ owner: null, meError: new ApiError(500) });
  await store.getState().restoreSession();
  assert.ok(storage.get(OWNER));
  await store.getState().login("user2@example.com", "password");
  assert.deepEqual(queue, []);
});

test("successful restore records the account owner without removing its existing data", async () => {
  const { store, storage, queue } = setup({ owner: null });
  await store.getState().restoreSession();
  assert.equal(storage.get(OWNER), "2");
  assert.equal(queue.length, 1);
  assert.equal(store.getState().isOfflineMode, false);
});

test("logout centrally clears the queue, local stores, credentials, and owner", async () => {
  const { store, storage, queue, data } = setup();
  storage.set(OFFLINE, "true");
  await store.getState().logout();
  assert.deepEqual(queue, []);
  assert.deepEqual(data.subscriptions, []);
  assert.deepEqual(data.settings, {});
  assert.equal(storage.size, 0);
  assert.equal(store.getState().hasCompletedOnboarding, false);
});

test("failed account deletion preserves the session and local pending data", async () => {
  const { store, storage, queue, data } = setup({ deleteError: new ApiError(500) });
  store.setState({ userId: 1, email: "user1@example.com", isOfflineMode: false, hasCompletedOnboarding: true });
  await assert.rejects(store.getState().deleteAccount(), /HTTP 500/);
  assert.equal(storage.get(TOKEN), "previous-token");
  assert.equal(storage.get(OWNER), "1");
  assert.equal(queue.length, 1);
  assert.equal(data.subscriptions.length, 1);
  assert.equal(store.getState().isOfflineMode, false);
  assert.equal(store.getState().userId, 1);
  assert.equal(store.getState().isLoading, false);
});

test("successful account deletion clears all account data centrally", async () => {
  const { store, storage, queue, data } = setup();
  await store.getState().deleteAccount();
  assert.deepEqual(queue, []);
  assert.deepEqual(data.subscriptions, []);
  assert.deepEqual(data.settings, {});
  assert.equal(storage.size, 0);
  assert.equal(store.getState().isOfflineMode, true);
});

test("unavailable native secure storage finishes web startup and permits offline mode", async () => {
  const { store, calls } = setup({ available: false, owner: null, token: null });
  await store.getState().restoreSession();
  await store.getState().useOfflineMode();
  assert.equal(store.getState().hasCheckedSession, true);
  assert.equal(store.getState().hasCompletedOnboarding, true);
  assert.equal(store.getState().isOfflineMode, true);
  assert.equal(calls.includes("me"), false);
});

for (const nextAction of ["login", "logout"]) {
  test(`a delayed restore cannot undo a newer ${nextAction}`, async () => {
    let resolve;
    const response = new Promise((done) => { resolve = done; });
    const { store, storage } = setup({ meResponse: response });
    const restore = store.getState().restoreSession();
    await new Promise((done) => setImmediate(done));
    await store.getState()[nextAction]("user2@example.com", "password");
    resolve({ id: 1, email: "user1@example.com" });
    await restore;
    assert.equal(store.getState().userId, nextAction === "login" ? 2 : null);
    assert.equal(storage.get(OWNER), nextAction === "login" ? "2" : undefined);
    assert.equal(storage.get(TOKEN), nextAction === "login" ? "new-token" : undefined);
  });
}
