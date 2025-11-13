// src/lib/stores/chat.store.ts
import type { Chat, FolderCollection, Folder } from '$lib/types/chat';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { browser } from '$app/environment';
import { DEFAULT_ANTHROPIC_MODEL_ID } from '$lib/config/models.config';

function createChatStore() {
	// A single state object powered by runes.
	// All state mutations will happen on this object, triggering reactivity.
	let state = $state({
		chats: [] as Chat[],
		folders: {} as FolderCollection,
		deletedFolders: [] as Folder[],
		isLoaded: false,
		generating: false
	});

	// Expose sync status directly from the service
	const syncStatus = syncService.status;

	async function initialize() {
		if (state.isLoaded) return;

		if (!browser) {
			console.warn('⚠️ Not in browser, skipping IndexedDB initialization');
			state.isLoaded = true;
			return;
		}

		try {
			await syncService.init();
			await loadFromLocal();
			state.isLoaded = true;
			console.log('✅ Chat stores initialized from local database');
		} catch (error) {
			console.error('❌ Failed to initialize chat stores:', error);
			state.isLoaded = true; // Allow app to work in degraded mode
		}
	}

	async function loadFromLocal() {
		const userId = 1; // TODO: Get from auth context
		const localChats = await localDB.getAllChats(userId);
		const localFolders = await localDB.getAllFolders(userId);

		state.chats = localChats
			.map((chat) => ({
				...chat,
				createdAt: new Date(chat.createdAt),
				updatedAt: new Date(chat.updatedAt)
			}))
			.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

		const folderCollection: FolderCollection = {};
		const deletedFoldersList: Folder[] = [];

		localFolders.forEach((folder) => {
			const folderWithDates: Folder = {
				...folder,
				createdAt: new Date(folder.createdAt),
				updatedAt: new Date(folder.updatedAt),
				deletedAt: folder.deletedAt ? new Date(folder.deletedAt) : null
			};
			if (!folderWithDates.deletedAt) {
				folderCollection[folder.id] = folderWithDates;
			} else {
				deletedFoldersList.push(folderWithDates);
			}
		});
		state.folders = folderCollection;
		state.deletedFolders = deletedFoldersList;
	}

	async function createChat(chatData: Partial<Chat>): Promise<Chat> {
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
					model: DEFAULT_ANTHROPIC_MODEL_ID,
					max_tokens: 4096,
					temperature: 0.7,
					top_p: 1,
					presence_penalty: 0,
					frequency_penalty: 0
				}
			},
			tags: chatData.tags || [],
			metadata: { tokenCount: 0, messageCount: 0, lastMessageAt: now },
			createdAt: now,
			updatedAt: now
		};

		await localDB.saveChat(newChat);
		// ✅ RUNE-BASED MUTATION: Simpler and more direct
		state.chats.unshift(newChat);

		const { userId: _, ...chatDataForServer } = newChat;
		syncService.queueOperation('CREATE', 'CHAT', chatId, chatDataForServer);
		return newChat;
	}

	async function updateChat(chatId: string, updates: Partial<Chat>) {
		const chatIndex = state.chats.findIndex((c) => c.id === chatId);
		if (chatIndex === -1) throw new Error(`Chat not found: ${chatId}`);

		const updatedChat = {
			...state.chats[chatIndex],
			...updates,
			updatedAt: new Date()
		};

		await localDB.saveChat(updatedChat);
		// ✅ RUNE-BASED MUTATION
		state.chats[chatIndex] = updatedChat;

		syncService.queueOperation('UPDATE', 'CHAT', chatId, updates);
	}

	async function deleteChat(chatId: string) {
		await localDB.deleteChat(chatId);
		// ✅ RUNE-BASED MUTATION
		state.chats = state.chats.filter((c) => c.id !== chatId);
		syncService.queueOperation('DELETE', 'CHAT', chatId, null);
	}

	// ... (You would refactor folder operations similarly) ...

	async function refreshFromServer() {
		console.log('🔄 Refreshing from server...');
		await syncService.forceSync();
		await loadFromLocal();
		console.log('✅ Data refreshed from server');
	}

	// Public API of the store
	return {
		// Expose the reactive state object directly
		get state() {
			return state;
		},
		// Expose methods
		initialize,
		createChat,
		updateChat,
		deleteChat,
		refreshFromServer,
		syncStatus
	};
}

export const chatStore = createChatStore();