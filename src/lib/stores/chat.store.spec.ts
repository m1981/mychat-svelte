// src/lib/stores/chat.store.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import {
  chats,
  folders,
  deletedFolders,
  createChat,
  updateChat,
  deleteChat,
  createFolder,
  updateFolder,
  deleteFolder,
  restoreFolder,
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
   * SCENARIO 2: Soft Delete - Folder Archive
   * Prove that deleting a folder archives it (soft delete) and moves chats to root
   */
  it('Scenario: Soft Delete - should archive folder and move chats to root', async () => {
    // ARRANGE: Create a folder and a chat inside it
    const folder = await createFolder({ name: 'Work' });
    const chat = await createChat(createMockChat({ folderId: folder.id }));

    // Verify initial state
    expect(Object.keys(get(folders))).toHaveLength(1);
    expect(get(chats)[0].folderId).toBe(folder.id);
    expect(get(deletedFolders)).toHaveLength(0);

    // ACT: Soft delete the folder (default behavior)
    await deleteFolder(folder.id);

    // ASSERT 1: The folder is removed from active folders store
    expect(Object.keys(get(folders))).toHaveLength(0);

    // ASSERT 2: The folder is added to deletedFolders store
    const deleted = get(deletedFolders);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].id).toBe(folder.id);
    expect(deleted[0].deletedAt).toBeInstanceOf(Date);

    // ASSERT 3: The folder is still in IndexedDB with deletedAt set
    const folderFromDB = await localDB.getFolder(folder.id);
    expect(folderFromDB).not.toBeNull();
    expect(folderFromDB?.deletedAt).toBeInstanceOf(Date);

    // ASSERT 4: The chat that was in the folder now has folderId set to undefined
    const updatedChatState = get(chats);
    expect(updatedChatState).toHaveLength(1);
    expect(updatedChatState[0].folderId).toBeUndefined();

    // ASSERT 5: The change was persisted to IndexedDB
    const chatFromDB = await localDB.getChat(chat.id);
    expect(chatFromDB?.folderId).toBeUndefined();

    // ASSERT 6: A 'DELETE' operation for the folder was queued with permanent: false
    expect(syncService.queueOperation).toHaveBeenCalledWith(
      'DELETE',
      'FOLDER',
      folder.id,
      { permanent: false }
    );
  });

  /**
   * SCENARIO 3: Restore Deleted Folder
   * Prove that a soft-deleted folder can be restored
   */
  it('Scenario: Restore - should restore archived folder back to active state', async () => {
    // ARRANGE: Create and soft-delete a folder
    const folder = await createFolder({ name: 'Archive Test' });
    await deleteFolder(folder.id, false); // Soft delete

    // Verify it's in deleted state
    expect(Object.keys(get(folders))).toHaveLength(0);
    expect(get(deletedFolders)).toHaveLength(1);

    // ACT: Restore the folder
    await restoreFolder(folder.id);

    // ASSERT 1: The folder is back in active folders
    const activeFolders = get(folders);
    expect(Object.keys(activeFolders)).toHaveLength(1);
    expect(activeFolders[folder.id]).toBeDefined();
    expect(activeFolders[folder.id].deletedAt).toBeNull();

    // ASSERT 2: The folder is removed from deletedFolders
    expect(get(deletedFolders)).toHaveLength(0);

    // ASSERT 3: IndexedDB is updated
    const folderFromDB = await localDB.getFolder(folder.id);
    expect(folderFromDB?.deletedAt).toBeNull();

    // ASSERT 4: An 'UPDATE' operation was queued
    expect(syncService.queueOperation).toHaveBeenCalledWith(
      'UPDATE',
      'FOLDER',
      folder.id,
      { deletedAt: null }
    );
  });

  /**
   * SCENARIO 4: Permanent Delete
   * Prove that permanent delete actually removes the folder from everywhere
   */
  it('Scenario: Permanent Delete - should completely remove folder from DB', async () => {
    // ARRANGE: Create and soft-delete a folder
    const folder = await createFolder({ name: 'To Be Purged' });
    await deleteFolder(folder.id, false); // Soft delete first

    // Verify it's soft deleted
    expect(get(deletedFolders)).toHaveLength(1);

    // ACT: Permanently delete the folder
    await deleteFolder(folder.id, true);

    // ASSERT 1: The folder is removed from deletedFolders store
    expect(get(deletedFolders)).toHaveLength(0);

    // ASSERT 2: The folder is completely removed from IndexedDB
    const folderFromDB = await localDB.getFolder(folder.id);
    expect(folderFromDB).toBeNull();

    // ASSERT 3: A 'DELETE' operation with permanent: true was queued
    expect(syncService.queueOperation).toHaveBeenLastCalledWith(
      'DELETE',
      'FOLDER',
      folder.id,
      { permanent: true }
    );
  });

  /**
   * SCENARIO 5: Data Persistence and Hydration with Deleted Folders
   * Prove that deleted folders are loaded into the correct store on initialization
   */
  it('Scenario: Hydration - should load active and deleted folders into separate stores', async () => {
    // ARRANGE: Manually insert data into DB
    const activeFolder: Folder = {
      id: 'folder-active',
      userId: 1,
      name: 'Active Folder',
      type: 'STANDARD',
      expanded: true,
      order: 1,
      color: '#3b82f6',
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const deletedFolder: Folder = {
      id: 'folder-deleted',
      userId: 1,
      name: 'Deleted Folder',
      type: 'STANDARD',
      expanded: false,
      order: 2,
      color: '#ef4444',
      deletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await localDB.saveFolder(activeFolder);
    await localDB.saveFolder(deletedFolder);

    // Reset stores
    folders.set({});
    deletedFolders.set([]);

    // ACT: Initialize the stores
    await initializeStores();

    // ASSERT 1: Active folder is in folders store
    const activeFolders = get(folders);
    expect(Object.keys(activeFolders)).toHaveLength(1);
    expect(activeFolders['folder-active']).toBeDefined();

    // ASSERT 2: Deleted folder is in deletedFolders store
    const deleted = get(deletedFolders);
    expect(deleted).toHaveLength(1);
    expect(deleted[0].id).toBe('folder-deleted');
    expect(deleted[0].deletedAt).toBeInstanceOf(Date);
  });

  /**
   * SCENARIO 6: Complex Update Logic
   * Prove that updating a chat correctly merges the changes, updates the timestamp,
   * and queues a partial update for the server.
   */
  it('Scenario: Complex Update - should update a chat title without affecting other properties', async () => {
    // ARRANGE: Create a chat with some initial data
    const originalChat = await createChat(createMockChat({ title: 'Original Title' }));
    const originalTimestamp = originalChat.updatedAt;

    // Small delay to ensure different timestamp
    await new Promise(resolve => setTimeout(resolve, 10));

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
      { title: 'Updated Title' }
    );
  });

  /**
   * SCENARIO 7: Folder Update
   * Prove that updating a folder correctly persists changes
   */
  it('Scenario: Folder Update - should update folder properties and persist to DB', async () => {
    // ARRANGE: Create a folder
    const folder = await createFolder({ name: 'Original Name', color: '#3b82f6' });

    // ACT: Update the folder
    await updateFolder(folder.id, { name: 'Updated Name', color: '#ef4444' });

    // ASSERT 1: Store is updated
    const updatedFolder = get(folders)[folder.id];
    expect(updatedFolder.name).toBe('Updated Name');
    expect(updatedFolder.color).toBe('#ef4444');

    // ASSERT 2: IndexedDB is updated
    const folderFromDB = await localDB.getFolder(folder.id);
    expect(folderFromDB?.name).toBe('Updated Name');
    expect(folderFromDB?.color).toBe('#ef4444');

    // ASSERT 3: Sync operation queued
    expect(syncService.queueOperation).toHaveBeenCalledWith(
      'UPDATE',
      'FOLDER',
      folder.id,
      expect.objectContaining({ name: 'Updated Name', color: '#ef4444' })
    );
  });

  /**
   * SCENARIO 8: Bulk Operations
   * Prove that clearing all data works correctly
   */
  it('Scenario: Bulk Delete - should clear all chats and folders when localDB.clearAll is used', async () => {
    // ARRANGE: Create some data
    await createFolder({ name: 'Folder 1' });
    await createChat(createMockChat({ title: 'Chat 1' }));
    await createChat(createMockChat({ title: 'Chat 2' }));

    expect(get(chats)).toHaveLength(2);
    expect(Object.keys(get(folders))).toHaveLength(1);

    // ACT: Clear all data
    await localDB.clearAll();
    await initializeStores();

    // ASSERT: The stores are now empty
    expect(get(chats)).toHaveLength(0);
    expect(Object.keys(get(folders))).toHaveLength(0);
    expect(get(deletedFolders)).toHaveLength(0);
  });

  /**
   * SCENARIO 9: Cannot restore non-deleted folder
   * Prove that restoring an active folder throws an error
   */
  it('Scenario: Validation - should throw error when trying to restore active folder', async () => {
    // ARRANGE: Create an active folder
    const folder = await createFolder({ name: 'Active Folder' });

    // ACT & ASSERT: Attempting to restore should throw
    await expect(restoreFolder(folder.id)).rejects.toThrow('Folder is not deleted');
  });

  /**
   * SCENARIO 10: Multiple chats in folder handling
   * Prove that deleting a folder with multiple chats moves all chats to root
   */
  it('Scenario: Multi-chat Folder - should move all chats to root when folder deleted', async () => {
    // ARRANGE: Create folder with multiple chats
    const folder = await createFolder({ name: 'Busy Folder' });
    const chat1 = await createChat(createMockChat({ title: 'Chat 1', folderId: folder.id }));
    const chat2 = await createChat(createMockChat({ title: 'Chat 2', folderId: folder.id }));
    const chat3 = await createChat(createMockChat({ title: 'Chat 3', folderId: folder.id }));

    // Verify setup
    const allChats = get(chats);
    expect(allChats.filter(c => c.folderId === folder.id)).toHaveLength(3);

    // ACT: Delete the folder
    await deleteFolder(folder.id);

    // ASSERT: All chats moved to root
    const updatedChats = get(chats);
    expect(updatedChats.filter(c => c.folderId === folder.id)).toHaveLength(0);
    expect(updatedChats.filter(c => !c.folderId)).toHaveLength(3);

    // Verify in DB
    const chat1FromDB = await localDB.getChat(chat1.id);
    const chat2FromDB = await localDB.getChat(chat2.id);
    const chat3FromDB = await localDB.getChat(chat3.id);
    expect(chat1FromDB?.folderId).toBeUndefined();
    expect(chat2FromDB?.folderId).toBeUndefined();
    expect(chat3FromDB?.folderId).toBeUndefined();
  });
});