import 'fake-indexeddb/auto';
import { beforeAll, afterEach, vi } from 'vitest';

// Mock the syncService to prevent actual network calls during tests
// and allow us to spy on its methods.
vi.mock('$lib/services/sync.service', () => ({
  syncService: {
    init: vi.fn().mockResolvedValue(undefined),
    queueOperation: vi.fn().mockResolvedValue(undefined),
    forceSync: vi.fn().mockResolvedValue(undefined),
    status: { subscribe: vi.fn() } // Mock the Svelte store's subscribe method
  }
}));

// Mock the browser environment for Svelte stores
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Clean up the database and stores between tests to ensure isolation
beforeAll(() => {
  // This ensures fake-indexeddb is ready
});

afterEach(async () => {
  const { localDB } = await import('$lib/services/local-db');
  const { chats, folders } = await import('$lib/stores/chat.store');

  // Clear the database
  await localDB.clearAll();

  // Reset Svelte stores to their initial state
  chats.set([]);
  folders.set({});

  // Clear any mock function call history
  vi.clearAllMocks();
});