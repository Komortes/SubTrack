const assert = require("node:assert/strict");
const test = require("node:test");
const { loadModule } = require("./loadModule.cjs");

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("clearing the queue during a token read never sends the previous account mutation", async () => {
  const queueKey = "subtrack:offline-queue";
  const oldMutation = {
    id: "01991aaa-1234-4123-8123-123456789abc",
    method: "POST",
    path: "/subscriptions",
    payload: { id: "01991aaa-1234-7123-8123-123456789abc", name: "Old account data" },
    createdAt: "2026-09-20T10:00:00.000Z",
  };
  const asyncStorage = new Map([[queueKey, JSON.stringify([oldMutation])]]);
  const tokenReadStarted = deferred();
  const releaseTokenRead = deferred();
  let currentToken = "old-token";
  const requests = [];

  const api = loadModule("lib/api.ts", {
    "expo-constants": { expoConfig: null },
    "expo-secure-store": {
      getItemAsync: async () => {
        tokenReadStarted.resolve();
        await releaseTokenRead.promise;
        return currentToken;
      },
    },
  });

  const originalFetch = global.fetch;
  global.fetch = async (url, options) => {
    requests.push({ url, authorization: options.headers.Authorization, body: options.body });
    return { ok: true, status: 204 };
  };

  try {
    const sync = loadModule("lib/sync.ts", {
      "@react-native-async-storage/async-storage": {
        getItem: async (key) => asyncStorage.get(key) ?? null,
        setItem: async (key, value) => asyncStorage.set(key, value),
        removeItem: async (key) => asyncStorage.delete(key),
      },
      "./api": api,
    });

    const flushing = sync.flushOfflineQueue();
    await tokenReadStarted.promise;
    await sync.clearOfflineQueue();
    currentToken = "new-token";
    const newMutation = { ...oldMutation, id: "01991aaa-1234-4123-8123-123456789abd", payload: {
      id: "01991aaa-1234-7123-8123-123456789abd", name: "New account data",
    } };
    await sync.enqueueMutation(newMutation);
    releaseTokenRead.resolve();
    await assert.rejects(flushing, { name: "ApiRequestCancelledError" });

    assert.equal(requests.length, 0);
    assert.deepEqual(await sync.readOfflineQueue(), [newMutation]);
    await sync.flushOfflineQueue();
    assert.equal(requests.length, 1);
    assert.equal(requests[0].authorization, "Bearer new-token");
    assert.match(requests[0].body, /New account data/);
    assert.doesNotMatch(requests[0].body, /Old account data/);
    assert.deepEqual(await sync.readOfflineQueue(), []);
  } finally {
    global.fetch = originalFetch;
  }
});

test("a stale request never tries a fallback host after a delayed network failure", async (context) => {
  let isCurrent = true;
  let requests = 0;
  const api = loadModule("lib/api.ts", {
    "expo-constants": { expoConfig: { hostUri: "192.0.2.1:8081" } },
    "expo-secure-store": { getItemAsync: async () => "old-token" },
  });
  context.mock.method(globalThis, "fetch", async () => {
    requests += 1;
    isCurrent = false;
    throw new Error("Connection lost during account handoff");
  });

  await assert.rejects(api.apiRequest("/settings", { method: "PUT" }, () => isCurrent), {
    name: "ApiRequestCancelledError",
  });
  assert.equal(requests, 1);
});
