import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiError, apiRequest } from "./api";

const OFFLINE_QUEUE_KEY = "subtrack:offline-queue";

export type OfflineMutation = {
  id: string;
  method: "POST" | "PUT" | "DELETE";
  path: string;
  payload?: unknown;
  createdAt: string;
};

export async function enqueueMutation(mutation: OfflineMutation): Promise<void> {
  const existing = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  const queue = existing ? (JSON.parse(existing) as OfflineMutation[]) : [];
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(compactQueue([...queue, mutation])));
}

export async function readOfflineQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

export async function getOfflineQueueSize(): Promise<number> {
  return (await readOfflineQueue()).length;
}

export async function clearOfflineQueue(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export async function flushOfflineQueue(): Promise<void> {
  const queue = compactQueue(await readOfflineQueue());
  const remaining: OfflineMutation[] = [];

  for (const mutation of queue) {
    try {
      await apiRequest(mutation.path, {
        method: mutation.method,
        body: mutation.payload ? JSON.stringify(sanitizeMutationPayload(mutation)) : undefined
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        continue;
      }
      remaining.push(mutation);
    }
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(remaining));
}

function sanitizeMutationPayload(mutation: OfflineMutation): unknown {
  if (!mutation.payload || typeof mutation.payload !== "object") {
    return mutation.payload;
  }

  const payload = { ...(mutation.payload as Record<string, unknown>) };

  if (mutation.method === "PUT" && mutation.path.startsWith("/subscriptions/")) {
    delete payload.id;
  }

  if (mutation.method === "POST" && mutation.path === "/subscriptions" && !isUuid(payload.id)) {
    delete payload.id;
  }

  return payload;
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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
      return [mutation];
    }

    const subscriptionId = getSubscriptionId(mutation);

    if (!subscriptionId) {
      return [...result, mutation];
    }

    if (mutation.method === "DELETE" && mutation.path === `/subscriptions/${subscriptionId}`) {
      const createIndex = result.findIndex(
        (item) => item.method === "POST" && item.path === "/subscriptions" && getPayloadId(item.payload) === subscriptionId
      );

      if (createIndex >= 0) {
        return result.filter((item) => getSubscriptionId(item) !== subscriptionId);
      }

      return [
        ...result.filter((item) => {
          if (getSubscriptionId(item) !== subscriptionId) {
            return true;
          }

          return item.method === "DELETE";
        }),
        mutation
      ];
    }

    if (mutation.method === "PUT") {
      const createIndex = result.findIndex(
        (item) => item.method === "POST" && item.path === "/subscriptions" && getPayloadId(item.payload) === subscriptionId
      );

      if (createIndex >= 0) {
        return result.map((item, index) =>
          index === createIndex ? { ...item, payload: { ...toRecord(item.payload), ...toRecord(mutation.payload) } } : item
        );
      }

      const updateIndex = result.findIndex(
        (item) => item.method === "PUT" && item.path === `/subscriptions/${subscriptionId}`
      );

      if (updateIndex >= 0) {
        return result.map((item, index) =>
          index === updateIndex ? { ...item, payload: { ...toRecord(item.payload), ...toRecord(mutation.payload) } } : item
        );
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
  return payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
}
