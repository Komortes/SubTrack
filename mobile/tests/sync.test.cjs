const assert = require("node:assert/strict");
const test = require("node:test");
const { setImmediate: nextTurn } = require("node:timers/promises");
const { loadModule } = require("./loadModule.cjs");

const QUEUE_KEY = "subtrack:offline-queue";
const SUBSCRIPTION_ID = "2649efad-4965-41ce-bf5c-31607b71fc22";
const SUBSCRIPTION_PATH = `/subscriptions/${SUBSCRIPTION_ID}`;

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function mutation(id, method, path, payload) {
  return { id, method, path, payload, createdAt: "2026-09-20T10:00:00.000Z" };
}

function setup(handler = async () => {}, initialQueue = []) {
  const storage = new Map([[QUEUE_KEY, JSON.stringify(initialQueue)]]);
  const requests = [];
  const sync = loadModule("lib/sync.ts", {
    "@react-native-async-storage/async-storage": {
      async getItem(key) {
        return storage.get(key) ?? null;
      },
      async setItem(key, value) {
        storage.set(key, value);
      },
      async removeItem(key) {
        storage.delete(key);
      },
    },
    "./api": {
      ApiError,
      async apiRequest(path, options) {
        const request = {
          path,
          method: options.method,
          payload: options.body === undefined ? undefined : JSON.parse(options.body),
        };
        requests.push(request);
        return handler(request);
      },
    },
  });
  return { sync, requests };
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("concurrent enqueue retains both independent user edits", async () => {
  const { sync } = setup();
  await Promise.all([
    sync.enqueueMutation(mutation("settings", "PUT", "/settings", { theme: "dark" })),
    sync.enqueueMutation(mutation("rename", "PUT", SUBSCRIPTION_PATH, { name: "Music" })),
  ]);

  assert.deepEqual(
    (await sync.readOfflineQueue()).map((entry) => entry.id).sort(),
    ["rename", "settings"],
  );
});

test("retrying persistence of the same mutation ID cannot duplicate a renewal", async () => {
  let paymentCount = 0;
  const { sync } = setup(async () => { paymentCount += 1; });
  const renewal = mutation("same-renewal", "POST", `${SUBSCRIPTION_PATH}/renew`);
  await Promise.all([sync.enqueueMutation(renewal), sync.enqueueMutation(renewal)]);
  assert.equal(await sync.getOfflineQueueSize(), 1);
  await sync.flushOfflineQueue();
  assert.equal(paymentCount, 1);
});

test("a failed create keeps its dependent renewal pending for a later sync", async () => {
  const create = mutation("create", "POST", "/subscriptions", { id: SUBSCRIPTION_ID, amount: 10 });
  const renew = mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`);
  const { sync, requests } = setup(async ({ path }) => {
    if (path === "/subscriptions") throw new ApiError("Server unavailable", 503);
    throw new ApiError("Subscription does not exist yet", 404);
  }, [create, renew]);

  await sync.flushOfflineQueue().catch(() => {});

  assert.deepEqual((await sync.readOfflineQueue()).map((entry) => entry.id), ["create", "renew"]);
  assert.equal(requests.length, 1, "dependent operations must wait for the failed create");
});

test("a partial sync rejects and retries only its failed operation and later edits", async () => {
  const failure = new ApiError("Rate limited", 429);
  let recovered = false;
  const { sync, requests } = setup(async ({ path }) => {
    if (!recovered && path.endsWith("/renew")) throw failure;
  }, [
    mutation("settings", "PUT", "/settings", { theme: "dark" }),
    mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`),
    mutation("price", "PUT", SUBSCRIPTION_PATH, { amount: 20 }),
  ]);

  await assert.rejects(sync.flushOfflineQueue(), (error) => error === failure);
  assert.deepEqual((await sync.readOfflineQueue()).map((entry) => entry.id), ["renew", "price"]);

  recovered = true;
  await sync.flushOfflineQueue();
  assert.equal(requests.filter((request) => request.path === "/settings").length, 1);
  assert.equal(await sync.getOfflineQueueSize(), 0);
});

test("an already deleted subscription does not prevent subsequent edits from syncing", async () => {
  let savedTheme;
  const { sync } = setup(async ({ method, payload }) => {
    if (method === "DELETE") throw new ApiError("Already deleted", 404);
    savedTheme = payload.theme;
  }, [
    mutation("delete", "DELETE", SUBSCRIPTION_PATH),
    mutation("settings", "PUT", "/settings", { theme: "dark" }),
  ]);

  await sync.flushOfflineQueue();

  assert.equal(savedTheme, "dark");
  assert.equal(await sync.getOfflineQueueSize(), 0);
});

for (const status of [401, 429]) {
  test(`HTTP ${status} retains the pending edit so it can sync after recovery`, async () => {
    const pending = mutation("rename", "PUT", SUBSCRIPTION_PATH, { name: "Music" });
    let recover = false;
    let savedName;
    const { sync } = setup(async ({ payload }) => {
      if (!recover) throw new ApiError("Temporary failure", status);
      savedName = payload.name;
    }, [pending]);

    await sync.flushOfflineQueue().catch(() => {});
    assert.deepEqual(await sync.readOfflineQueue(), [pending]);

    recover = true;
    await sync.flushOfflineQueue();
    assert.equal(savedName, "Music");
    assert.equal(await sync.getOfflineQueueSize(), 0);
  });
}

test("an edit queued during a request is synced or remains pending, never erased", async () => {
  const started = deferred();
  const finishRequest = deferred();
  const { sync, requests } = setup(async () => {
    started.resolve();
    await finishRequest.promise;
  }, [mutation("first", "PUT", SUBSCRIPTION_PATH, { amount: 10 })]);

  const flushing = sync.flushOfflineQueue();
  await started.promise;
  const enqueueing = sync.enqueueMutation(mutation("second", "PUT", "/settings", { theme: "dark" }));
  await nextTurn();
  finishRequest.resolve();
  await Promise.all([flushing, enqueueing]);

  const wasSent = requests.some((request) => request.path === "/settings" && request.payload.theme === "dark");
  const isPending = (await sync.readOfflineQueue()).some((entry) => entry.path === "/settings" && entry.payload.theme === "dark");
  assert.ok(wasSent || isPending, "the newer setting must exist on the server or in the queue");
});

test("an offline edit finishes persisting before the current network request completes", async () => {
  const started = deferred();
  const finishRequest = deferred();
  const { sync } = setup(async () => {
    started.resolve();
    await finishRequest.promise;
  }, [mutation("first", "PUT", SUBSCRIPTION_PATH, { amount: 10 })]);
  const flushing = sync.flushOfflineQueue();
  await started.promise;
  let persisted = false;
  const enqueueing = sync.enqueueMutation(mutation("second", "PUT", "/settings", { theme: "dark" }))
    .then(() => { persisted = true; });

  try {
    await nextTurn();
    assert.equal(persisted, true, "saving offline data must not wait for a server response");
  } finally {
    finishRequest.resolve();
    await Promise.all([flushing, enqueueing]);
  }
});

test("a late successful response cannot remove a newer edit to the same subscription", async () => {
  const started = deferred();
  const finishRequest = deferred();
  let serverAmount;
  const { sync } = setup(async ({ payload }) => {
    if (payload.amount === 20) throw new ApiError("Network offline", 0);
    started.resolve();
    await finishRequest.promise;
    serverAmount = payload.amount;
  }, [mutation("first", "PUT", SUBSCRIPTION_PATH, { amount: 10 })]);
  const flushing = sync.flushOfflineQueue().catch(() => {});
  await started.promise;
  const enqueueing = sync.enqueueMutation(mutation("second", "PUT", SUBSCRIPTION_PATH, { amount: 20 }));
  await nextTurn();
  finishRequest.resolve();
  await Promise.all([flushing, enqueueing]);

  assert.equal(serverAmount, 10);
  assert.deepEqual((await sync.readOfflineQueue()).map(({ id, payload }) => ({ id, payload })), [
    { id: "second", payload: { amount: 20 } },
  ]);
});

test("concurrent flushes record a queued renewal only once", async () => {
  const started = deferred();
  const finishRequest = deferred();
  let paymentCount = 0;
  const { sync } = setup(async () => {
    paymentCount += 1;
    started.resolve();
    await finishRequest.promise;
  }, [mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`)]);

  const firstFlush = sync.flushOfflineQueue();
  await started.promise;
  const secondFlush = sync.flushOfflineQueue();
  await nextTurn();
  finishRequest.resolve();
  await Promise.all([firstFlush, secondFlush]);

  assert.equal(paymentCount, 1);
  assert.equal(await sync.getOfflineQueueSize(), 0);
});

test("clearing during a failed request cannot resurrect the old queue", async () => {
  const started = deferred();
  const finishRequest = deferred();
  const { sync } = setup(async () => {
    started.resolve();
    await finishRequest.promise;
    throw new ApiError("Server unavailable", 503);
  }, [mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`)]);

  const flushing = sync.flushOfflineQueue().catch(() => {});
  await started.promise;
  const clearing = sync.clearOfflineQueue();
  await nextTurn();
  finishRequest.resolve();
  await Promise.all([flushing, clearing]);

  assert.equal(await sync.getOfflineQueueSize(), 0);
});

test("clearing during sync stops the old session and preserves edits queued after the clear", async () => {
  const started = deferred();
  const finishRequest = deferred();
  const { sync, requests } = setup(async () => {
    started.resolve();
    await finishRequest.promise;
  }, [
    mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`),
    mutation("old-settings", "PUT", "/settings", { theme: "dark" }),
  ]);
  const flushing = sync.flushOfflineQueue();
  await started.promise;
  let cleared = false;
  const clearing = sync.clearOfflineQueue().then(async () => {
    cleared = true;
    await sync.enqueueMutation(mutation("new-settings", "PUT", "/settings", { theme: "light" }));
  });

  try {
    await nextTurn();
    assert.equal(cleared, true, "clearing local data must not wait for a server response");
  } finally {
    finishRequest.resolve();
    await Promise.all([flushing, clearing]);
  }

  assert.equal(requests.length, 1, "the previous session must stop after its in-flight request");
  assert.deepEqual((await sync.readOfflineQueue()).map((entry) => entry.id), ["new-settings"]);
});

test("deleting all subscriptions preserves a queued settings change", async () => {
  const { sync, requests } = setup();
  await sync.enqueueMutation(mutation("settings", "PUT", "/settings", { theme: "dark" }));
  await sync.enqueueMutation(mutation("delete-all", "DELETE", "/subscriptions"));
  await sync.flushOfflineQueue();

  assert.deepEqual(requests, [
    { method: "PUT", path: "/settings", payload: { theme: "dark" } },
    { method: "DELETE", path: "/subscriptions", payload: undefined },
  ]);
});

test("deleting a queued create removes a subscription committed before a response timeout", async () => {
  const serverSubscriptions = new Set();
  const { sync } = setup(async ({ method, path, payload }) => {
    if (method === "POST" && path === "/subscriptions") {
      serverSubscriptions.add(payload.id);
      throw new ApiError("Response timed out after commit", 0);
    }
    if (method === "DELETE" && path === SUBSCRIPTION_PATH) {
      serverSubscriptions.delete(SUBSCRIPTION_ID);
    }
  });
  await sync.enqueueMutation(mutation("create", "POST", "/subscriptions", { id: SUBSCRIPTION_ID, amount: 10 }));
  await sync.flushOfflineQueue().catch(() => {});
  assert.ok(serverSubscriptions.has(SUBSCRIPTION_ID));

  await sync.enqueueMutation(mutation("delete", "DELETE", SUBSCRIPTION_PATH));
  await sync.flushOfflineQueue();

  assert.equal(serverSubscriptions.size, 0, "an uncertain create result still needs a server-side delete");
});

test("an edit after a committed create timeout still updates the idempotently created subscription", async () => {
  let serverAmount;
  let timedOut = false;
  const { sync } = setup(async ({ method, path, payload }) => {
    if (method === "POST" && path === "/subscriptions") {
      serverAmount ??= payload.amount;
      if (!timedOut) {
        timedOut = true;
        throw new ApiError("Response timed out after commit", 0);
      }
    } else if (method === "PUT") {
      serverAmount = payload.amount;
    }
  });
  await sync.enqueueMutation(mutation("create", "POST", "/subscriptions", { id: SUBSCRIPTION_ID, amount: 10 }));
  await sync.flushOfflineQueue().catch(() => {});
  assert.equal(serverAmount, 10);

  await sync.enqueueMutation(mutation("price", "PUT", SUBSCRIPTION_PATH, { amount: 20 }));
  await sync.flushOfflineQueue();

  assert.equal(serverAmount, 20);
  assert.equal(await sync.getOfflineQueueSize(), 0);
});

for (const firstAction of ["create", "update"]) {
  test(`a price edit after renewal must not change the payment recorded after ${firstAction}`, async () => {
    const server = { amount: 5, payments: [] };
    const { sync } = setup(async ({ method, path, payload }) => {
      if (method === "POST" && path.endsWith("/renew")) {
        server.payments.push(server.amount);
      } else {
        server.amount = payload.amount;
      }
    });
    await sync.enqueueMutation(firstAction === "create"
      ? mutation("initial", "POST", "/subscriptions", { id: SUBSCRIPTION_ID, amount: 10 })
      : mutation("initial", "PUT", SUBSCRIPTION_PATH, { amount: 10 }));
    await sync.enqueueMutation(mutation("renew", "POST", `${SUBSCRIPTION_PATH}/renew`));
    await sync.enqueueMutation(mutation("later-edit", "PUT", SUBSCRIPTION_PATH, { amount: 20 }));
    await sync.flushOfflineQueue();

    assert.deepEqual(server, { amount: 20, payments: [10] });
  });
}

test("adjacent edits merge their fields and strip the immutable id before sending", async () => {
  const { sync, requests } = setup();
  await sync.enqueueMutation(mutation("name", "PUT", SUBSCRIPTION_PATH, { id: SUBSCRIPTION_ID, name: "Music" }));
  await sync.enqueueMutation(mutation("price", "PUT", SUBSCRIPTION_PATH, { amount: 20 }));
  await sync.flushOfflineQueue();

  assert.deepEqual(requests, [
    { method: "PUT", path: SUBSCRIPTION_PATH, payload: { name: "Music", amount: 20 } },
  ]);
  assert.equal(await sync.getOfflineQueueSize(), 0);
});

for (const path of ["/settings", SUBSCRIPTION_PATH]) {
  test(`partial API payloads for ${path} do not erase earlier fields with undefined`, async () => {
    const { sync, requests } = setup();
    await sync.enqueueMutation(mutation("first", "PUT", path, { first: "saved", second: undefined }));
    await sync.enqueueMutation(mutation("second", "PUT", path, {
      first: undefined, second: "new", cleared: null, enabled: false, amount: 0,
    }));
    await sync.flushOfflineQueue();

    assert.deepEqual(requests[0].payload, {
      first: "saved", second: "new", cleared: null, enabled: false, amount: 0,
    });
  });
}

test("queued creates preserve UUIDv7 subscription IDs", async () => {
  const id = "01991aaa-1234-7123-8123-123456789abc";
  const { sync, requests } = setup();
  await sync.enqueueMutation(mutation("create", "POST", "/subscriptions", { id, amount: 10 }));
  await sync.flushOfflineQueue();
  assert.equal(requests[0].payload.id, id);
});

test("legacy renewals derive a stable payment ID from the queued mutation across timeout retries", async () => {
  const id = "01991aaa-1234-4123-8123-123456789abc";
  const payments = new Set();
  let first = true;
  const { sync, requests } = setup(async ({ payload }) => {
    payments.add(payload?.payment_id ?? `unstable-${payments.size}`);
    if (first) { first = false; throw new ApiError("Timeout", 0); }
  }, [mutation(id, "POST", `${SUBSCRIPTION_PATH}/renew`)]);
  await assert.rejects(sync.flushOfflineQueue());
  await sync.flushOfflineQueue();
  assert.equal(payments.size, 1);
  assert.deepEqual(requests.map((request) => request.payload), [{ payment_id: id }, { payment_id: id }]);
});

test("renewals preserve an explicitly provided payment ID", async () => {
  const id = "01991aaa-1234-4123-8123-123456789abc";
  const paymentId = "01991aaa-1234-7123-8123-123456789abc";
  const { sync, requests } = setup(undefined, [mutation(id, "POST", `${SUBSCRIPTION_PATH}/renew`, { payment_id: paymentId })]);
  await sync.flushOfflineQueue();
  assert.equal(requests[0].payload.payment_id, paymentId);
});

for (const status of [402, 404, 422]) {
  test(`resource HTTP ${status} preserves dependents but permits unrelated subscriptions and settings`, async () => {
    const failure = new ApiError("Resource needs attention", status);
    const { sync, requests } = setup(async ({ path }) => {
      if (path === SUBSCRIPTION_PATH) throw failure;
    }, [
      mutation("failed", "PUT", SUBSCRIPTION_PATH, { amount: 10 }),
      mutation("dependent", "POST", `${SUBSCRIPTION_PATH}/renew`),
      mutation("independent", "PUT", "/subscriptions/other", { amount: 20 }),
      mutation("settings", "PUT", "/settings", { theme: "dark" }),
    ]);
    await assert.rejects(sync.flushOfflineQueue(), (error) => error === failure);
    assert.deepEqual(requests.map((request) => request.path), [SUBSCRIPTION_PATH, "/subscriptions/other", "/settings"]);
    assert.deepEqual((await sync.readOfflineQueue()).map((entry) => entry.id), ["failed", "dependent"]);
  });
}

test("a global delete remains a barrier when an earlier subscription request is blocked", async () => {
  const started = deferred();
  const finishRequest = deferred();
  const { sync, requests } = setup(async () => {
    started.resolve();
    await finishRequest.promise;
    throw new ApiError("Resource needs attention", 422);
  }, [mutation("failed", "PUT", SUBSCRIPTION_PATH, { amount: 10 })]);
  const flushing = sync.flushOfflineQueue().catch(() => {});
  await started.promise;
  await sync.enqueueMutation(mutation("delete-all", "DELETE", "/subscriptions"));
  await sync.enqueueMutation(mutation("settings", "PUT", "/settings", { theme: "dark" }));
  finishRequest.resolve();
  await flushing;
  assert.equal(requests.length, 1);
  assert.deepEqual((await sync.readOfflineQueue()).map((entry) => entry.id), ["failed", "delete-all", "settings"]);
});
