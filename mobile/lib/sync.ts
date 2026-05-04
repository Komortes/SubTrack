import AsyncStorage from "@react-native-async-storage/async-storage";

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
  queue.push(mutation);
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export async function readOfflineQueue(): Promise<OfflineMutation[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  return raw ? (JSON.parse(raw) as OfflineMutation[]) : [];
}

