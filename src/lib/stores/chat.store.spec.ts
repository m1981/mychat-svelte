import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import {
  chats,
  folders,
  createChat,
  updateChat,
  deleteChat,
  createFolder,
  deleteFolder,
  initializeStores,
} from './chat.store';
import type { Chat, Folder } from '$lib/types/chat';

// Helper to create a mock chat for tests
const createMockChat = (overrides: Partial<Chat> = {}): Partial<Chat> => ({
  title: 'Test Chat',
  folderId: undefined,
  ...overrides,
});

describe('Chat Store (Local-First Architecture)', () => {

  // Ensure stores are initialized before each test
  beforeEach(async () => {
    await initializeStores();
  });

  /**
   * SCENARIO 1: Optimistic Updates
   * Prove that when a user creates a chat, the UI (Svelte store) updates instantly,
   * and the operation is queued for the server in the background.
   */
  it('Scenario: Optimistic Create - should add a new chat to the store immediately and queue a sync operation', async () => {
    // ARRANGE: The store is initially empty
    expect(get(chats)).toHaveLength(0);

    // ACT: Create a new chat
    const newChatData = createMockChat({ title: 'Optimistic Chat' });
    const createdChat = await createChat(newChatData);

    // ASSERT 1: The Svelte store is updated immediately
    const chatsState = get(chats);
    expect(chatsState).toHaveLength(1);
    expect(chatsState[0].title).toBe('Optimistic Chat');
    expect(chatsState[0].id).toBe(createdChat.id);

    // ASSERT 2: The data was persisted to IndexedDB
    const chatFromDB = await localDB.getChat(createdChat.id);
    expect(chatFromDB).not.toBeNull();
    expect(chatFromDB?.title).toBe('Optimistic Chat');

    // ASSERT 3: A 'CREATE' operation was queued for the sync service
    expect(syncService.queueOperation).toHaveBeenCalledOnce();
    expect(syncService.queueOperation).toHaveBeenCalledWith(
      'CREATE',
      'CHAT',
      createdChat.id,
      expect.objectContaining({ title: 'Optimistic Chat' })
    );
  });

  /**
   * SCENARIO 2: Data Integrity and State Consistency
   * Prove that deleting a folder correctly removes it from the state and also
   * updates any chats that were inside it, ensuring no orphaned data.
   */
  it('Scenario: State Consistency - should delete a folder and un-assign its chats', async () => {
    // ARRANGE: Create a folder and a chat inside it
    const folder = await createFolder({ name: 'Work' });
    const chat = await createChat(createMockChat({ folderId: folder.id }));

    // Verify initial state
    expect(Object.keys(get(folders))).toHaveLength(1);
    expect(get(chats)[0].folderId).toBe(folder.id);

    // ACT: Delete the folder
    await deleteFolder(folder.id);

    // ASSERT 1: The folder is removed from the folders store
    expect(Object.keys(get(folders))).toHaveLength(0);

    // ASSERT 2: The chat that was in the folder now has its folderId set to undefined
    const updatedChatState = get(chats);
    expect(updatedChatState).toHaveLength(1);
    expect(updatedChatState[0].folderId).toBeUndefined();

    // ASSERT 3: The change was persisted to IndexedDB
    const chatFromDB = await localDB.getChat(chat.id);
    expect(chatFromDB?.folderId).toBeUndefined();

    // ASSERT 4: A 'DELETE' operation for the folder was queued
    expect(syncService.queueOperation).toHaveBeenCalledWith('DELETE', 'FOLDER', folder.id, null);
  });

  /**
   * SCENARIO 3: Data Persistence and Hydration
   * Prove that if data exists in IndexedDB from a previous session, the stores
   * are correctly hydrated with that data upon initialization.
   */
  it('Scenario: Hydration - should load existing data from IndexedDB on initialization', async () => {
    // ARRANGE: Manually insert data into the DB to simulate a previous session.
    // We bypass the store functions here to test the loading mechanism itself.
    const chatToPreload: Chat = {
      id: 'chat-123',
      userId: 1,
      title: 'Pre-existing Chat',
      messages: [],
      config: {} as any,
      tags: [],
      metadata: {} as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await localDB.saveChat(chatToPreload);

    // Reset stores to be empty before initialization
    chats.set([]);
    expect(get(chats)).toHaveLength(0);

    // ACT: Initialize the stores
    await initializeStores();

    // ASSERT: The stores are now populated with the data from IndexedDB
    const chatsState = get(chats);
    expect(chatsState).toHaveLength(1);
    expect(chatsState[0].title).toBe('Pre-existing Chat');
  });

  /**
   * SCENARIO 4: Complex Update Logic
   * Prove that updating a chat correctly merges the changes, updates the timestamp,
   * and queues a partial update for the server.
   */
  it('Scenario: Complex Update - should update a chat title without affecting other properties', async () => {
    // ARRANGE: Create a chat with some initial data
    const originalChat = await createChat(createMockChat({ title: 'Original Title' }));
    const originalTimestamp = originalChat.updatedAt;

    // ACT: Update only the title of the chat
    await updateChat(originalChat.id, { title: 'Updated Title' });

    // ASSERT 1: The title is updated in the Svelte store
    const updatedChatInStore = get(chats).find(c => c.id === originalChat.id);
    expect(updatedChatInStore?.title).toBe('Updated Title');

    // ASSERT 2: The timestamp has been updated
    expect(updatedChatInStore?.updatedAt.getTime()).toBeGreaterThan(originalTimestamp.getTime());

    // ASSERT 3: Other properties (like createdAt) remain unchanged
    expect(updatedChatInStore?.createdAt).toEqual(originalChat.createdAt);

    // ASSERT 4: A partial update operation was queued for the sync service
    expect(syncService.queueOperation).toHaveBeenCalledWith(
      'UPDATE',
      'CHAT',
      originalChat.id,
      { title: 'Updated Title' } // Note: only the changed field is queued
    );
  });

  /**
   * SCENARIO 5: Bulk Operations
   * Prove that a user can clear all local data, for example on logout.
   */
  it('Scenario: Bulk Delete - should clear all chats and folders when localDB.clearAll is used', async () => {
    // ARRANGE: Create some data
    await createFolder({ name: 'Folder 1' });
    await createChat(createMockChat({ title: 'Chat 1' }));
    await createChat(createMockChat({ title: 'Chat 2' }));

    expect(get(chats)).toHaveLength(2);
    expect(Object.keys(get(folders))).toHaveLength(1);

    // ACT: Call the underlying clearAll method
    await localDB.clearAll();

    // Now, re-load the stores from the (now empty) DB
    await initializeStores();

    // ASSERT: The stores are now empty
    expect(get(chats)).toHaveLength(0);
    expect(Object.keys(get(folders))).toHaveLength(0);
  });
});