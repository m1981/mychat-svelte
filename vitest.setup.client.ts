// vitest.setup.client.ts
import 'fake-indexeddb/auto';
import { afterEach, vi } from 'vitest';

globalThis.indexedDB = indexedDB;
globalThis.IDBKeyRange = IDBKeyRange;

vi.mock('$lib/services/sync.service', () => ({
  syncService: {
    init: vi.fn().mockResolvedValue(undefined),
    queueOperation: vi.fn().mockResolvedValue(undefined),
    forceSync: vi.fn().mockResolvedValue(undefined),
    status: { subscribe: vi.fn() }
  }
}));

vi.mock('$app/environment', () => ({
  browser: true,
}));

afterEach(async () => {
  const { localDB } = await import('$lib/services/local-db');
  const { chats, folders } = await import('$lib/stores/chat.store');

  await localDB.clearAll();
  chats.set([]);
  folders.set({});
  vi.clearAllMocks();
});