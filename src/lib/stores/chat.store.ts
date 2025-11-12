// src/lib/stores/chat.store.ts
/**
 * SINGLE SOURCE OF TRUTH for Chat State
 * Local-First Architecture:
 * - Writes to IndexedDB first (optimistic updates)
 * - Queues operations for server sync
 * - Reads from IndexedDB on load
 */

import { writable, derived, get } from 'svelte/store';
import type { Chat, FolderCollection, Folder } from '$lib/types/chat';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { browser } from '$app/environment';
import { DEFAULT_ANTHROPIC_MODEL_ID } from '$lib/config/models.config';

// Core stores
export const chats = writable<Chat[]>([]);
export const folders = writable<FolderCollection>({});
export const currentChatIndex = writable<number>(0);
export const generating = writable<boolean>(false);
export const isLoaded = writable<boolean>(false);

// Derived stores
export const currentChat = derived(
	[chats, currentChatIndex],
	([$chats, $index]) => $chats[$index] || null
);

export const chatCount = derived(
	chats,
	($chats) => $chats.length
);

export const folderCount = derived(
	folders,
	($folders) => Object.keys($folders).length
);

// This should NOT be derived - it needs async data fetch
// Use a regular writable store instead
export const deletedFolders = writable<Folder[]>([]);

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize stores from IndexedDB
 * Call this once on app startup
 */
export async function initializeStores(): Promise<void> {
	console.log('📍 initializeStores called, browser =', browser);

	if (!browser) {
		console.warn('⚠️ Not in browser, skipping IndexedDB initialization');
		// CRITICAL: Still mark as loaded so SSR works
		isLoaded.set(true);
		return;
	}

	try {
		console.log('📍 Initializing sync service...');
		// Initialize sync service (which initializes IndexedDB)
		await syncService.init();
		console.log('✅ Sync service initialized');

		console.log('📍 Loading data from IndexedDB...');
		// Load data from IndexedDB
		await loadFromLocal();
		console.log('✅ Data loaded from IndexedDB');

		isLoaded.set(true);
		console.log('✅ Chat stores initialized from local database');
	} catch (error) {
		console.error('❌ Failed to initialize chat stores:', error);
		// Still mark as loaded to allow app to work (degraded mode)
		isLoaded.set(true);
		console.log('⚠️ Marked as loaded despite error (degraded mode)');
	}
}

/**
 * Load all data from IndexedDB
 */
async function loadFromLocal(): Promise<void> {
	const userId = 1; // TODO: Get from auth context

	// Load chats
	const localChats = await localDB.getAllChats(userId);

	// Fix: Ensure dates are Date objects (IndexedDB may return strings)
	const chatsWithDates = localChats.map(chat => ({
		...chat,
		createdAt: chat.createdAt instanceof Date ? chat.createdAt : new Date(chat.createdAt),
		updatedAt: chat.updatedAt instanceof Date ? chat.updatedAt : new Date(chat.updatedAt)
	}));

	chats.set(chatsWithDates.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));

	// Load folders (only active ones)
	const localFolders = await localDB.getAllFolders(userId);
	const folderCollection: FolderCollection = {};
	const deletedFoldersList: Folder[] = [];

	localFolders.forEach((folder) => {
		// ✅ FIX: Properly convert dates
		const folderWithDates: Folder = {
			...folder,
			createdAt: folder.createdAt instanceof Date ? folder.createdAt : new Date(folder.createdAt),
			updatedAt: folder.updatedAt instanceof Date ? folder.updatedAt : new Date(folder.updatedAt),
			deletedAt: folder.deletedAt
				? (folder.deletedAt instanceof Date ? folder.deletedAt : new Date(folder.deletedAt))
				: null
		};

		if (!folderWithDates.deletedAt) {
			// Active folder
			folderCollection[folder.id] = folderWithDates;
		} else {
			// Deleted folder
			deletedFoldersList.push(folderWithDates);
		}
	});

	folders.set(folderCollection);
	deletedFolders.set(deletedFoldersList);
}

/**
 * Create a new chat (local-first with optimistic update)
 */
export async function createChat(chatData: Partial<Chat>): Promise<Chat> {
	const userId = 1; // TODO: Get from auth context
	const chatId = `chat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const now = new Date();

	const newChat: Chat = {
		id: chatId,
		userId,
		title: chatData.title || 'New Chat',
		folderId: chatData.folderId,
		messages: chatData.messages || [],
		config: chatData.config || {
			provider: 'anthropic',
			modelConfig: {
				// Use the centralized default model ID
				model: DEFAULT_ANTHROPIC_MODEL_ID,
				max_tokens: 4096,
				temperature: 0.7,
				top_p: 1,
				presence_penalty: 0,
				frequency_penalty: 0
			}
		},
		tags: chatData.tags || [],
		metadata: chatData.metadata || {
			tokenCount: 0,
			messageCount: 0,
			lastMessageAt: now
		},
		createdAt: now,
		updatedAt: now
	};

	// 1. Save to IndexedDB immediately (optimistic)
	await localDB.saveChat(newChat);

	// 2. Update store (triggers UI reactivity)
	chats.update((current) => {
		if (newChat.folderId) {
			// Insert after other chats in same folder
			const folderIndex = current.findLastIndex((c) => c.folderId === newChat.folderId);
			if (folderIndex !== -1) {
				const updated = [...current];
				updated.splice(folderIndex + 1, 0, newChat);
				return updated;
			}
		}
		// Otherwise, add to beginning
		return [newChat, ...current];
	});

	// 3. Queue for server sync (send without userId - server will add it)
	// Remove userId from data sent to server
	const { userId: _, ...chatDataForServer } = newChat;

	syncService.queueOperation('CREATE', 'CHAT', chatId, chatDataForServer).catch((error) => {
		console.error('❌ Failed to queue chat creation for sync:', error);
	});

	console.log(`✅ Chat created locally: ${chatId}`);
	return newChat;
}

/**
 * Update a chat (local-first with optimistic update)
 */
export async function updateChat(chatId: string, updates: Partial<Chat>): Promise<void> {
	// 1. Get current chat from IndexedDB
	const chat = await localDB.getChat(chatId);
	if (!chat) throw new Error(`Chat not found: ${chatId}`);

	// ✅ Ensure updatedAt is always newer than current timestamp
	const updatedChat: Chat = {
		...chat,
		...updates,
		updatedAt: new Date(Math.max(Date.now(), chat.updatedAt.getTime() + 1))
	};

	// 3. Save to IndexedDB
	await localDB.saveChat(updatedChat);

	// 4. Update store (triggers UI reactivity)
	chats.update((current) =>
		current.map((c) => (c.id === chatId ? updatedChat : c))
	);

	// 5. Queue for server sync (async, non-blocking)
	syncService.queueOperation('UPDATE', 'CHAT', chatId, updates).catch((error) => {
		console.error('❌ Failed to queue chat update for sync:', error);
	});

	console.log(`✅ Chat updated locally: ${chatId}`);
}

/**
 * Delete a chat (local-first with optimistic update)
 */
export async function deleteChat(chatId: string): Promise<void> {
	// 1. Delete from IndexedDB
	await localDB.deleteChat(chatId);

	// 2. Update store (triggers UI reactivity)
	chats.update((current) => current.filter((c) => c.id !== chatId));

	// 3. Reset current chat index if needed
	const allChats = get(chats);
	const currentIndex = get(currentChatIndex);
	if (currentIndex >= allChats.length && allChats.length > 0) {
		currentChatIndex.set(allChats.length - 1);
	} else if (allChats.length === 0) {
		currentChatIndex.set(0);
	}

	// 4. Queue for server sync (async, non-blocking)
	syncService.queueOperation('DELETE', 'CHAT', chatId, null).catch((error) => {
		console.error('❌ Failed to queue chat deletion for sync:', error);
	});

	console.log(`✅ Chat deleted locally: ${chatId}`);
}

/**
 * Get a chat by ID (from store, not IndexedDB)
 */
export function getChatById(chatId: string): Chat | undefined {
	const allChats = get(chats);
	return allChats.find((c) => c.id === chatId);
}

/**
 * Set the active chat by ID
 */
export function setCurrentChatById(chatId: string): void {
	const allChats = get(chats);
	const index = allChats.findIndex((c) => c.id === chatId);
	if (index !== -1) {
		currentChatIndex.set(index);
	}
}

// ============================================
// FOLDER OPERATIONS
// ============================================

/**
 * Create a new folder (local-first with optimistic update)
 */
export async function createFolder(folderData: Partial<Folder>): Promise<Folder> {
	const userId = 1; // TODO: Get from auth context
	const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const now = new Date();

	// Get max order
	const currentFolders = get(folders);
	const maxOrder = Object.values(currentFolders).reduce(
		(max, f) => Math.max(max, f.order || 0),
		0
	);

	const newFolder: Folder = {
		id: folderId,
		userId,
		name: folderData.name || 'Untitled Folder',
		parentId: folderData.parentId,
		type: folderData.type || 'STANDARD',
		expanded: true,
		order: maxOrder + 1,
		color: folderData.color || '#3b82f6',
		deletedAt: null, // ✅ FIX: Initialize as null
		createdAt: now,
		updatedAt: now
	};

	// 1. Save to IndexedDB
	await localDB.saveFolder(newFolder);

	// 2. Update store (triggers UI reactivity)
	folders.update((current) => ({
		...current,
		[folderId]: newFolder
	}));

	// 3. Queue for server sync (async, non-blocking)
	// ✅ FIX: Remove userId from server payload
	const { userId: _, ...folderDataForServer } = newFolder;
	syncService.queueOperation('CREATE', 'FOLDER', folderId, folderDataForServer).catch((error) => {
		console.error('❌ Failed to queue folder creation for sync:', error);
	});

	console.log(`✅ Folder created locally: ${folderId}`);
	return newFolder;
}

/**
 * Update a folder (local-first with optimistic update)
 */
export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
	// 1. Get current folder
	const folder = await localDB.getFolder(folderId);
	if (!folder) throw new Error(`Folder not found: ${folderId}`);

	// 2. Apply updates
	const updatedFolder: Folder = {
		...folder,
		...updates,
		updatedAt: new Date()
	};

	// 3. Save to IndexedDB
	await localDB.saveFolder(updatedFolder);

	// 4. Update store (triggers UI reactivity)
	folders.update((current) => ({
		...current,
		[folderId]: updatedFolder
	}));

	// 5. Queue for server sync (async, non-blocking)
	syncService.queueOperation('UPDATE', 'FOLDER', folderId, updates).catch((error) => {
		console.error('❌ Failed to queue folder update for sync:', error);
	});

	console.log(`✅ Folder updated locally: ${folderId}`);
}

/**
 * Delete a folder (local-first with optimistic update)
 */
export async function deleteFolder(folderId: string, permanent = false): Promise<void> {
	if (permanent) {
		// Hard delete (admin only, or after 30 days in trash)
		await localDB.deleteFolder(folderId);

		folders.update((current) => {
			const updated = { ...current };
			delete updated[folderId];
			return updated;
		});

		// ✅ FIX: Also remove from deleted folders list
		deletedFolders.update((current) => current.filter(f => f.id !== folderId));
	} else {
		// Soft delete (archive)
		const folder = await localDB.getFolder(folderId);
		if (!folder) throw new Error(`Folder not found: ${folderId}`);

		const archivedFolder: Folder = {
			...folder,
			deletedAt: new Date(),
			updatedAt: new Date()
		};

		await localDB.saveFolder(archivedFolder);

		// Remove from active folders UI
		folders.update((current) => {
			const updated = { ...current };
			delete updated[folderId];
			return updated;
		});

		// ✅ FIX: Add to deleted folders list
		deletedFolders.update((current) => [...current, archivedFolder]);

		// Archive chats in this folder
		const affectedChats = get(chats).filter(c => c.folderId === folderId);
		for (const chat of affectedChats) {
			await updateChat(chat.id, { folderId: undefined }); // Move to root
		}
	}

	syncService.queueOperation('DELETE', 'FOLDER', folderId, { permanent }).catch((error) => {
		console.error('❌ Failed to queue folder deletion for sync:', error);
	});

	console.log(`✅ Folder ${permanent ? 'deleted' : 'archived'}: ${folderId}`);
}

/**
 * Restore a deleted folder
 */
export async function restoreFolder(folderId: string): Promise<void> {
	const folder = await localDB.getFolder(folderId);
	if (!folder) throw new Error(`Folder not found: ${folderId}`);
	if (!folder.deletedAt) throw new Error('Folder is not deleted');

	const restoredFolder: Folder = {
		...folder,
		deletedAt: null,
		updatedAt: new Date()
	};

	await localDB.saveFolder(restoredFolder);

	// ✅ FIX: Add back to active folders
	folders.update((current) => ({
		...current,
		[folderId]: restoredFolder
	}));

	// ✅ FIX: Remove from deleted folders list
	deletedFolders.update((current) => current.filter(f => f.id !== folderId));

	syncService.queueOperation('UPDATE', 'FOLDER', folderId, { deletedAt: null }).catch((error) => {
		console.error('❌ Failed to queue folder restore for sync:', error);
	});

	console.log(`✅ Folder restored: ${folderId}`);
}

/**
 * Refresh all data from server (manual sync)
 */
export async function refreshFromServer(): Promise<void> {
	console.log('🔄 Refreshing from server...');
	await syncService.forceSync();
	await loadFromLocal();
	console.log('✅ Data refreshed from server');
}

/**
 * Get sync status (for UI display)
 */
export const syncStatus = syncService.status;