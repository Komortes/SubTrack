import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiRequest } from "./api";

const OFFLINE_QUEUE_KEY = "subtrack:offline-queue";
let queueOperation: Promise<void> = Promise.resolve();
let activeFlush: Promise<void> | null = null;
let activeMutationId: string | null = null;
let queueEpoch = 0;

export type OfflineMutation = {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  path: string;
  payload?: unknown;
  createdAt: string;
};

export async function enqueueMutation(mutation: OfflineMutation): Promise<void> {
  await serializeQueueOperation(async () => {
    const queue = await readOfflineQueue();
    if (queue.some((item) => item.id === mutation.id)) {
      return;
    }
    const activeIndex = queue.findIndex((item) => item.id === activeMutationId);
    // The request body already sent to the server is immutable. Compact only
    // its tail so a later edit can never disappear with the accepted head.
    const fixedPrefix = queue.slice(0, activeIndex + 1);
    const pendingTail = queue.slice(activeIndex + 1);
    await writeOfflineQueue([...fixedPrefix, ...compactQueue([...pendingTail, mutation])]);
  });
}

export async function readOfflineQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

export async function getOfflineQueueSize(): Promise<number> {
  return (await readOfflineQueue()).length;
}

export async function clearOfflineQueue(): Promise<void> {
  await serializeQueueOperation(async () => {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    queueEpoch += 1;
    activeMutationId = null;
  });
}

export async function flushOfflineQueue(): Promise<void> {
  if (activeFlush) {
    return activeFlush;
  }

  const flush = flushQueue();
  activeFlush = flush;

  try {
    await flush;
  } finally {
    activeFlush = null;
  }
}

async function flushQueue(): Promise<void> {
  const epoch = await serializeQueueOperation(async () => queueEpoch);
  const blockedResources = new Set<string>();
  let firstResourceFailure: ApiError | null = null;

  try {
    while (true) {
      const mutation = await serializeQueueOperation(async () => {
        if (queueEpoch !== epoch) {
          return null;
        }

        const stored = await readOfflineQueue();
        // Once a resource is blocked, retain its failed operation and every
        // dependent operation verbatim while independent resources can progress.
        const queue = blockedResources.size > 0 ? stored : compactQueue(stored);
        await writeOfflineQueue(queue);
        let head: OfflineMutation | null = null;
        for (const candidate of queue) {
          if (candidate.method === "DELETE" && candidate.path === "/subscriptions"
            && [...blockedResources].some((resource) => resource.startsWith("/subscriptions/"))) break;
          const resource = getMutationResource(candidate);
          if (resource && blockedResources.has(resource)) continue;
          head = candidate;
          break;
        }
        activeMutationId = head?.id ?? null;
        return head;
      });

      if (!mutation) {
        if (firstResourceFailure && queueEpoch === epoch) throw firstResourceFailure;
        return;
      }

      try {
        const payload = sanitizeMutationPayload(mutation);
        await apiRequest(mutation.path, {
          method: mutation.method,
          body: payload !== undefined ? JSON.stringify(payload) : undefined
        }, () => queueEpoch === epoch);
      } catch (error) {
        // A missing DELETE target is already in the requested state.
        if (!(mutation.method === "DELETE" && error instanceof ApiError && error.status === 404)) {
          const resource = getMutationResource(mutation);
          if (resource && error instanceof ApiError && [402, 404, 422].includes(error.status)) {
            firstResourceFailure ??= error;
            blockedResources.add(resource);
            await serializeQueueOperation(async () => {
              if (queueEpoch === epoch) activeMutationId = null;
            });
            continue;
          }
          throw error;
        }
      }

      await serializeQueueOperation(async () => {
        if (queueEpoch !== epoch) {
          return;
        }

        const queue = await readOfflineQueue();
        await writeOfflineQueue(queue.filter((item) => item.id !== mutation.id));
        activeMutationId = null;
      });
    }
  } finally {
    await serializeQueueOperation(async () => {
      if (queueEpoch === epoch) {
        activeMutationId = null;
      }
    });
  }
}

function serializeQueueOperation<T>(operation: () => Promise<T>): Promise<T> {
  const pending = queueOperation.then(operation);
  // Keep the lock usable after a rejected request or storage operation.
  queueOperation = pending.then(() => undefined, () => undefined);
  return pending;
}

async function writeOfflineQueue(queue: OfflineMutation[]): Promise<void> {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

function sanitizeMutationPayload(mutation: OfflineMutation): unknown {
  const isRenewal = mutation.method === "POST" && /^\/subscriptions\/[^/]+\/renew$/.test(mutation.path);
  if (isRenewal && mutation.payload === undefined && isUuid(mutation.id)) {
    return { payment_id: mutation.id };
  }
  if (!mutation.payload || typeof mutation.payload !== "object") {
    return mutation.payload;
  }

  const payload = { ...(mutation.payload as Record<string, unknown>) };
  if (isRenewal && !("payment_id" in payload) && isUuid(mutation.id)) {
    payload.payment_id = mutation.id;
  }

  if (mutation.method === "PUT" && mutation.path.startsWith("/subscriptions/")) {
    delete payload.id;
  }

  if (mutation.method === "POST" && mutation.path === "/subscriptions" && !isUuid(payload.id)) {
    delete payload.id;
  }

  return payload;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getMutationResource(mutation: OfflineMutation): string | null {
  const subscriptionId = getSubscriptionId(mutation);
  return subscriptionId ? `/subscriptions/${subscriptionId}` : mutation.path === "/settings" ? "/settings" : null;
}

function compactQueue(queue: OfflineMutation[]): OfflineMutation[] {
  return queue.reduce<OfflineMutation[]>((result, mutation) => {
    if (mutation.method === "PUT" && mutation.path === "/settings") {
      const settingsIndex = result.findIndex((item) => item.method === "PUT" && item.path === "/settings");

      if (settingsIndex >= 0) {
        return result.map((item, index) =>
          index === settingsIndex ? { ...item, payload: { ...toRecord(item.payload), ...toRecord(mutation.payload) } } : item
        );
      }
    }

    if (mutation.method === "DELETE" && mutation.path === "/subscriptions") {
      return [
        ...result.filter((item) => item.path !== "/subscriptions" && !item.path.startsWith("/subscriptions/")),
        mutation
      ];
    }

    const subscriptionId = getSubscriptionId(mutation);

    if (!subscriptionId) {
      return [...result, mutation];
    }

    if (mutation.method === "DELETE" && mutation.path === `/subscriptions/${subscriptionId}`) {
      // A queued create may already have reached the server before a timeout.
      // Keep the delete even when removing that create from the local queue.
      return [
        ...result.filter((item) => getSubscriptionId(item) !== subscriptionId),
        mutation
      ];
    }

    if (mutation.method === "PUT" && mutation.path === `/subscriptions/${subscriptionId}`) {
      for (let index = result.length - 1; index >= 0; index -= 1) {
        const previous = result[index];
        if (getSubscriptionId(previous) !== subscriptionId) {
          continue;
        }

        const canMerge = previous.method === "PUT" && previous.path === mutation.path;
        if (canMerge) {
          return result.map((item, itemIndex) =>
            itemIndex === index ? { ...item, payload: { ...toRecord(item.payload), ...toRecord(mutation.payload) } } : item
          );
        }

        // A renewal observes the current amount/date. A create may already
        // have committed before a timeout, so its later update must also stay
        // separate from an idempotent replay of that create.
        break;
      }
    }

    return [...result, mutation];
  }, []);
}

function getSubscriptionId(mutation: OfflineMutation): string | null {
  if (mutation.path === "/subscriptions" && mutation.method === "POST") {
    return getPayloadId(mutation.payload);
  }

  const match = mutation.path.match(/^\/subscriptions\/([^/]+)/);
  return match?.[1] ?? null;
}

function getPayloadId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("id" in payload)) {
    return null;
  }

  const id = (payload as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
}

function toRecord(payload: unknown): Record<string, unknown> {
  // API serializers use undefined for omitted patch fields. Those must not
  // overwrite an earlier queued value, while explicit null remains a change.
  return payload && typeof payload === "object"
    ? Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined))
    : {};
}
