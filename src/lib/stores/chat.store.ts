// src/lib/stores/chat.store.enhanced.ts
/**
 * Enhanced Chat Store with Local-First Architecture
 * - Writes to IndexedDB first (optimistic updates)
 * - Queues operations for server sync
 * - Reads from IndexedDB on load
 */

import { writable, derived, get } from 'svelte/store';
import type { Chat, FolderCollection, Folder } from '$lib/types/chat';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { browser } from '$app/environment';

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

/**
 * Initialize stores from IndexedDB
 */
export async function initializeStores(): Promise<void> {
	if (!browser) return;

	try {
		// Initialize sync service (which initializes IndexedDB)
		await syncService.init();

		// Load data from IndexedDB
		await loadFromLocal();

		isLoaded.set(true);
		console.log('✅ Stores initialized from local database');
	} catch (error) {
		console.error('Failed to initialize stores:', error);
		// Still mark as loaded to allow app to work (degraded mode)
		isLoaded.set(true);
	}
}

/**
 * Load all data from IndexedDB
 */
async function loadFromLocal(): Promise<void> {
	const userId = 1; // TODO: Get from auth

	// Load chats
	const localChats = await localDB.getAllChats(userId);
	chats.set(localChats.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()));

	// Load folders
	const localFolders = await localDB.getAllFolders(userId);
	const folderCollection: FolderCollection = {};
	localFolders.forEach((folder) => {
		folderCollection[folder.id] = folder;
	});
	folders.set(folderCollection);
}

/**
 * Create a new chat (local-first)
 */
export async function createChat(chatData: Partial<Chat>): Promise<Chat> {
	const userId = 1; // TODO: Get from auth
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
				model: 'claude-3-7-sonnet-20250219',
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

	// 2. Update store
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

	// 3. Queue for server sync
	await syncService.queueOperation('CREATE', 'CHAT', chatId, newChat);

	console.log(`✅ Chat created locally: ${chatId}`);
	return newChat;
}

/**
 * Update a chat (local-first)
 */
export async function updateChat(chatId: string, updates: Partial<Chat>): Promise<void> {
	// 1. Get current chat from IndexedDB
	const chat = await localDB.getChat(chatId);
	if (!chat) throw new Error('Chat not found');

	// 2. Apply updates
	const updatedChat: Chat = {
		...chat,
		...updates,
		updatedAt: new Date()
	};

	// 3. Save to IndexedDB
	await localDB.saveChat(updatedChat);

	// 4. Update store
	chats.update((current) =>
		current.map((c) => (c.id === chatId ? updatedChat : c))
	);

	// 5. Queue for server sync
	await syncService.queueOperation('UPDATE', 'CHAT', chatId, updates);

	console.log(`✅ Chat updated locally: ${chatId}`);
}

/**
 * Delete a chat (local-first)
 */
export async function deleteChat(chatId: string): Promise<void> {
	// 1. Delete from IndexedDB
	await localDB.deleteChat(chatId);

	// 2. Update store
	chats.update((current) => current.filter((c) => c.id !== chatId));

	// 3. Queue for server sync
	await syncService.queueOperation('DELETE', 'CHAT', chatId, null);

	console.log(`✅ Chat deleted locally: ${chatId}`);
}

/**
 * Create a new folder (local-first)
 */
export async function createFolder(folderData: Partial<Folder>): Promise<Folder> {
	const userId = 1; // TODO: Get from auth
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
		createdAt: now,
		updatedAt: now
	};

	// 1. Save to IndexedDB
	await localDB.saveFolder(newFolder);

	// 2. Update store
	folders.update((current) => ({
		...current,
		[folderId]: newFolder
	}));

	// 3. Queue for server sync
	await syncService.queueOperation('CREATE', 'FOLDER', folderId, newFolder);

	console.log(`✅ Folder created locally: ${folderId}`);
	return newFolder;
}

/**
 * Update a folder (local-first)
 */
export async function updateFolder(folderId: string, updates: Partial<Folder>): Promise<void> {
	// 1. Get current folder
	const folder = await localDB.getFolder(folderId);
	if (!folder) throw new Error('Folder not found');

	// 2. Apply updates
	const updatedFolder: Folder = {
		...folder,
		...updates,
		updatedAt: new Date()
	};

	// 3. Save to IndexedDB
	await localDB.saveFolder(updatedFolder);

	// 4. Update store
	folders.update((current) => ({
		...current,
		[folderId]: updatedFolder
	}));

	// 5. Queue for server sync
	await syncService.queueOperation('UPDATE', 'FOLDER', folderId, updates);

	console.log(`✅ Folder updated locally: ${folderId}`);
}

/**
 * Delete a folder (local-first)
 */
export async function deleteFolder(folderId: string): Promise<void> {
	// 1. Delete from IndexedDB
	await localDB.deleteFolder(folderId);

	// 2. Update store
	folders.update((current) => {
		const updated = { ...current };
		delete updated[folderId];
		return updated;
	});

	// 3. Queue for server sync
	await syncService.queueOperation('DELETE', 'FOLDER', folderId, null);

	console.log(`✅ Folder deleted locally: ${folderId}`);
}

/**
 * Refresh all data from server (manual sync)
 */
export async function refreshFromServer(): Promise<void> {
	console.log('🔄 Refreshing from server...');
	await syncService.forceSync();
	await loadFromLocal();
	console.log('✅ Data refreshed');
}

/**
 * Get sync status
 */
export const syncStatus = syncService.status;