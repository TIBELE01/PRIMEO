// Unit tests for syncQueue — uses an in-memory AsyncStorage mock
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue, QueuedOperation } from '../src/services/offline/syncQueue';

// ── In-memory AsyncStorage ────────────────────────────────────────────────────

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();

  (AsyncStorage.getItem as jest.Mock).mockImplementation(async (k: string) => store.get(k) ?? null);
  (AsyncStorage.setItem as jest.Mock).mockImplementation(async (k: string, v: string) => { store.set(k, v); });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(async (k: string) => { store.delete(k); });
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOp(overrides: Partial<QueuedOperation> = {}): Omit<QueuedOperation, 'id' | 'enqueuedAt' | 'retries'> {
  return {
    method: 'POST',
    url: '/test/endpoint',
    payload: { foo: 'bar' },
    ...overrides,
  };
}

// ── enqueue / getAll / remove ─────────────────────────────────────────────────

describe('enqueue', () => {
  it('adds an operation to the queue', async () => {
    await syncQueue.enqueue(makeOp());
    const all = await syncQueue.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]!.url).toBe('/test/endpoint');
  });

  it('assigns an id and a timestamp', async () => {
    await syncQueue.enqueue(makeOp());
    const [op] = await syncQueue.getAll();
    expect(op!.id).toBeTruthy();
    expect(typeof op!.enqueuedAt).toBe('number');
    expect(op!.retries).toBe(0);
  });

  it('appends multiple operations', async () => {
    await syncQueue.enqueue(makeOp({ url: '/a' }));
    await syncQueue.enqueue(makeOp({ url: '/b' }));
    const all = await syncQueue.getAll();
    expect(all).toHaveLength(2);
    expect(all.map(o => o.url)).toEqual(['/a', '/b']);
  });
});

describe('getAll', () => {
  it('returns empty array when queue is empty', async () => {
    const all = await syncQueue.getAll();
    expect(all).toEqual([]);
  });
});

describe('remove', () => {
  it('removes the matching operation', async () => {
    await syncQueue.enqueue(makeOp({ url: '/remove-me' }));
    const [op] = await syncQueue.getAll();
    await syncQueue.remove(op!.id);
    const remaining = await syncQueue.getAll();
    expect(remaining).toHaveLength(0);
  });

  it('leaves other operations intact', async () => {
    await syncQueue.enqueue(makeOp({ url: '/keep' }));
    // Small pause so the two operations get distinct Date.now() IDs
    await new Promise(r => setTimeout(r, 2));
    await syncQueue.enqueue(makeOp({ url: '/remove' }));
    const all = await syncQueue.getAll();
    const toRemove = all.find(o => o.url === '/remove')!;
    expect(toRemove).toBeDefined();
    await syncQueue.remove(toRemove.id);
    const remaining = await syncQueue.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]!.url).toBe('/keep');
  });
});

// ── hasPending ────────────────────────────────────────────────────────────────

describe('hasPending', () => {
  it('returns false for an empty queue', async () => {
    expect(await syncQueue.hasPending()).toBe(false);
  });

  it('returns true when at least one operation is queued', async () => {
    await syncQueue.enqueue(makeOp());
    expect(await syncQueue.hasPending()).toBe(true);
  });

  it('returns false after all operations are removed', async () => {
    await syncQueue.enqueue(makeOp());
    const [op] = await syncQueue.getAll();
    await syncQueue.remove(op!.id);
    expect(await syncQueue.hasPending()).toBe(false);
  });
});

// ── flush ─────────────────────────────────────────────────────────────────────

describe('flush', () => {
  function makeClient(overrides: Partial<Record<string, jest.Mock>> = {}) {
    return {
      post:   jest.fn(async () => ({ data: {} })),
      put:    jest.fn(async () => ({ data: {} })),
      patch:  jest.fn(async () => ({ data: {} })),
      delete: jest.fn(async () => ({ data: {} })),
      ...overrides,
    };
  }

  it('returns { synced: 0, failed: 0 } on empty queue', async () => {
    const result = await syncQueue.flush(makeClient());
    expect(result).toEqual({ synced: 0, failed: 0 });
  });

  it('executes all operations and removes them on success', async () => {
    await syncQueue.enqueue(makeOp({ method: 'POST', url: '/create' }));
    await syncQueue.enqueue(makeOp({ method: 'PUT', url: '/update' }));
    const client = makeClient();

    const result = await syncQueue.flush(client);
    expect(result).toEqual({ synced: 2, failed: 0 });
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.put).toHaveBeenCalledTimes(1);
    expect(await syncQueue.getAll()).toHaveLength(0);
  });

  it('counts failed operations when API throws', async () => {
    await syncQueue.enqueue(makeOp({ url: '/fail' }));
    const client = makeClient({ post: jest.fn(async () => { throw new Error('network'); }) });

    const result = await syncQueue.flush(client);
    expect(result.failed).toBe(1);
    expect(result.synced).toBe(0);
  });

  it('increments retry count on failure (below MAX_RETRIES)', async () => {
    await syncQueue.enqueue(makeOp({ url: '/retry' }));
    const client = makeClient({ post: jest.fn(async () => { throw new Error('network'); }) });

    await syncQueue.flush(client);
    const [op] = await syncQueue.getAll();
    expect(op!.retries).toBe(1);
  });

  it('dead-letters an operation after MAX_RETRIES failures', async () => {
    // Manually place an op with retries = 4 (one more will trigger removal)
    const op: QueuedOperation = {
      id: 'dead-letter-test',
      method: 'POST',
      url: '/dead',
      payload: {},
      enqueuedAt: Date.now(),
      retries: 4,
    };
    store.set('sync_queue', JSON.stringify([op]));

    const client = makeClient({ post: jest.fn(async () => { throw new Error('final'); }) });
    const result = await syncQueue.flush(client);

    expect(result.failed).toBe(1);
    expect(await syncQueue.getAll()).toHaveLength(0); // removed after MAX_RETRIES
  });

  it('handles mixed success and failure', async () => {
    await syncQueue.enqueue(makeOp({ url: '/ok', method: 'POST' }));
    await syncQueue.enqueue(makeOp({ url: '/fail', method: 'PUT' }));
    const client = makeClient({
      post: jest.fn(async () => ({ data: {} })),
      put:  jest.fn(async () => { throw new Error('fail'); }),
    });

    const result = await syncQueue.flush(client);
    expect(result.synced).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('calls the correct HTTP method for each operation', async () => {
    await syncQueue.enqueue(makeOp({ method: 'DELETE', url: '/item/1', payload: {} }));
    const client = makeClient();
    await syncQueue.flush(client);
    expect(client.delete).toHaveBeenCalledWith('/item/1', {});
  });
});
