// syncQueue — queues failed write operations for retry when connectivity is restored.
// Operations are executed in FIFO order. flush() returns a result so callers can
// show the user a success / partial-failure toast.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '../../utils/safeJson';

const QUEUE_KEY = 'sync_queue';

export interface QueuedOperation {
  id: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  payload: unknown;
  enqueuedAt: number;
  retries: number;
}

export interface FlushResult {
  synced: number;
  failed: number;
}

const MAX_RETRIES = 5;

export const syncQueue = {
  enqueue: async (op: Omit<QueuedOperation, 'id' | 'enqueuedAt' | 'retries'>): Promise<void> => {
    const existing = await syncQueue.getAll();
    existing.push({ ...op, id: Date.now().toString(), enqueuedAt: Date.now(), retries: 0 });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
  },

  getAll: async (): Promise<QueuedOperation[]> => {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    // Analyse défensive : une file corrompue ne doit pas casser la synchro
    const parsed = safeJsonParse<QueuedOperation[]>(raw, []);
    return Array.isArray(parsed) ? parsed : [];
  },

  remove: async (id: string): Promise<void> => {
    const existing = await syncQueue.getAll();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing.filter((op) => op.id !== id)));
  },

  hasPending: async (): Promise<boolean> => {
    const ops = await syncQueue.getAll();
    return ops.length > 0;
  },

  // Execute all queued operations in order.
  // Successful ops are removed. Failed ops increment their retry counter;
  // ops that exceed MAX_RETRIES are removed (dead-lettered).
  flush: async (
    apiClient: { post: Function; put: Function; patch: Function; delete: Function },
  ): Promise<FlushResult> => {
    const ops = await syncQueue.getAll();
    let synced = 0;
    let failed = 0;

    for (const op of ops) {
      try {
        await (apiClient as Record<string, Function>)[op.method.toLowerCase()](op.url, op.payload);
        await syncQueue.remove(op.id);
        synced++;
      } catch {
        const newRetries = op.retries + 1;
        if (newRetries >= MAX_RETRIES) {
          // Give up after MAX_RETRIES — remove from queue
          await syncQueue.remove(op.id);
          console.warn(`[SyncQueue] giving up on ${op.method} ${op.url} after ${MAX_RETRIES} retries`);
        } else {
          // Update retry count in place
          const all = await syncQueue.getAll();
          const idx = all.findIndex((o) => o.id === op.id);
          if (idx !== -1) {
            all[idx]!.retries = newRetries;
            await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(all));
          }
        }
        failed++;
      }
    }

    return { synced, failed };
  },
};
