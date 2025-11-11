// src/lib/services/local-db.ts
/**
 * IndexedDB wrapper for local-first persistence
 * Stores chats, folders, notes, highlights, and sync queue
 */

import type { Chat, Folder, Tag } from '$lib/types/chat';
import type { Note, Highlight, Attachment } from '$lib/types/entities';

const DB_NAME = 'better-chatgpt-db';
const DB_VERSION = 1;

export interface SyncOperation {
	id: string;
	type: 'CREATE' | 'UPDATE' | 'DELETE';
	entity: 'CHAT' | 'FOLDER' | 'NOTE' | 'HIGHLIGHT' | 'TAG' | 'ATTACHMENT';
	entityId: string;
	data: any;
	timestamp: Date;
	retries: number;
	error?: string;
}

export class LocalDB {
	private db: IDBDatabase | null = null;

	/**
	 * Initialize IndexedDB with schema
	 */
	async init(): Promise<void> {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(DB_NAME, DB_VERSION);

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				this.db = request.result;
				resolve();
			};

			request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create object stores
				if (!db.objectStoreNames.contains('chats')) {
					const chatStore = db.createObjectStore('chats', { keyPath: 'id' });
					chatStore.createIndex('userId', 'userId', { unique: false });
					chatStore.createIndex('folderId', 'folderId', { unique: false });
					chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
				}

				if (!db.objectStoreNames.contains('folders')) {
					const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
					folderStore.createIndex('userId', 'userId', { unique: false });
					folderStore.createIndex('parentId', 'parentId', { unique: false });
				}

				if (!db.objectStoreNames.contains('notes')) {
					const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
					noteStore.createIndex('chatId', 'chatId', { unique: false });
					noteStore.createIndex('messageId', 'messageId', { unique: false });
				}

				if (!db.objectStoreNames.contains('highlights')) {
					const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
					highlightStore.createIndex('messageId', 'messageId', { unique: false });
				}

				if (!db.objectStoreNames.contains('attachments')) {
					const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
					attachmentStore.createIndex('chatId', 'chatId', { unique: false });
				}

				if (!db.objectStoreNames.contains('tags')) {
					const tagStore = db.createObjectStore('tags', { keyPath: 'id' });
					tagStore.createIndex('userId', 'userId', { unique: false });
					tagStore.createIndex('type', 'type', { unique: false });
				}

				// Sync queue for offline operations
				if (!db.objectStoreNames.contains('syncQueue')) {
					const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
					syncStore.createIndex('timestamp', 'timestamp', { unique: false });
					syncStore.createIndex('entity', 'entity', { unique: false });
				}

				// Metadata store for sync status
				if (!db.objectStoreNames.contains('metadata')) {
					db.createObjectStore('metadata', { keyPath: 'key' });
				}
			};
		});
	}

	/**
	 * Generic get operation
	 */
	private async get<T>(storeName: string, id: string): Promise<T | null> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([storeName], 'readonly');
			const store = transaction.objectStore(storeName);
			const request = store.get(id);

			request.onsuccess = () => resolve(request.result || null);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generic getAll operation with optional index
	 */
	private async getAll<T>(
		storeName: string,
		indexName?: string,
		indexValue?: any
	): Promise<T[]> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([storeName], 'readonly');
			const store = transaction.objectStore(storeName);

			let request: IDBRequest;
			if (indexName && indexValue !== undefined) {
				const index = store.index(indexName);
				request = index.getAll(indexValue);
			} else {
				request = store.getAll();
			}

			request.onsuccess = () => resolve(request.result || []);
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generic put operation
	 */
	private async put(storeName: string, data: any): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([storeName], 'readwrite');
			const store = transaction.objectStore(storeName);
			const request = store.put(data);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	/**
	 * Generic delete operation
	 */
	private async delete(storeName: string, id: string): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction([storeName], 'readwrite');
			const store = transaction.objectStore(storeName);
			const request = store.delete(id);

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	// =================================================================
	// CHAT OPERATIONS
	// =================================================================

	async getChat(id: string): Promise<Chat | null> {
		return this.get<Chat>('chats', id);
	}

	async getAllChats(userId?: number, folderId?: string): Promise<Chat[]> {
		if (folderId) {
			return this.getAll<Chat>('chats', 'folderId', folderId);
		}
		if (userId) {
			return this.getAll<Chat>('chats', 'userId', userId);
		}
		return this.getAll<Chat>('chats');
	}

	async saveChat(chat: Chat): Promise<void> {
		return this.put('chats', chat);
	}

	async deleteChat(id: string): Promise<void> {
		return this.delete('chats', id);
	}

	// =================================================================
	// FOLDER OPERATIONS
	// =================================================================

	async getFolder(id: string): Promise<Folder | null> {
		return this.get<Folder>('folders', id);
	}

	async getAllFolders(userId?: number): Promise<Folder[]> {
		if (userId) {
			return this.getAll<Folder>('folders', 'userId', userId);
		}
		return this.getAll<Folder>('folders');
	}

	async saveFolder(folder: Folder): Promise<void> {
		return this.put('folders', folder);
	}

	async deleteFolder(id: string): Promise<void> {
		return this.delete('folders', id);
	}

	// =================================================================
	// NOTE OPERATIONS
	// =================================================================

	async getNote(id: string): Promise<Note | null> {
		return this.get<Note>('notes', id);
	}

	async getNotesByChatId(chatId: string): Promise<Note[]> {
		return this.getAll<Note>('notes', 'chatId', chatId);
	}

	async saveNote(note: Note): Promise<void> {
		return this.put('notes', note);
	}

	async deleteNote(id: string): Promise<void> {
		return this.delete('notes', id);
	}

	// =================================================================
	// HIGHLIGHT OPERATIONS
	// =================================================================

	async getHighlight(id: string): Promise<Highlight | null> {
		return this.get<Highlight>('highlights', id);
	}

	async getHighlightsByMessageId(messageId: string): Promise<Highlight[]> {
		return this.getAll<Highlight>('highlights', 'messageId', messageId);
	}

	async saveHighlight(highlight: Highlight): Promise<void> {
		return this.put('highlights', highlight);
	}

	async deleteHighlight(id: string): Promise<void> {
		return this.delete('highlights', id);
	}

	// =================================================================
	// SYNC QUEUE OPERATIONS
	// =================================================================

	async addToSyncQueue(operation: Omit<SyncOperation, 'id'>): Promise<void> {
		const op: SyncOperation = {
			...operation,
			id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		};
		return this.put('syncQueue', op);
	}

	async getSyncQueue(): Promise<SyncOperation[]> {
		const operations = await this.getAll<SyncOperation>('syncQueue');
		return operations.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
	}

	async removeFromSyncQueue(id: string): Promise<void> {
		return this.delete('syncQueue', id);
	}

	async updateSyncOperation(operation: SyncOperation): Promise<void> {
		return this.put('syncQueue', operation);
	}

	async clearSyncQueue(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(['syncQueue'], 'readwrite');
			const store = transaction.objectStore('syncQueue');
			const request = store.clear();

			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	}

	// =================================================================
	// METADATA OPERATIONS
	// =================================================================

	async getMetadata(key: string): Promise<any> {
		return this.get('metadata', key);
	}

	async setMetadata(key: string, value: any): Promise<void> {
		return this.put('metadata', { key, value });
	}

	async getLastSyncTime(): Promise<Date | null> {
		const result = await this.getMetadata('lastSyncTime');
		return result?.value ? new Date(result.value) : null;
	}

	async setLastSyncTime(time: Date): Promise<void> {
		return this.setMetadata('lastSyncTime', time.toISOString());
	}

	// =================================================================
	// BULK OPERATIONS
	// =================================================================

	/**
	 * Clear all data (useful for logout)
	 */
	async clearAll(): Promise<void> {
		if (!this.db) throw new Error('Database not initialized');

		const storeNames = [
			'chats',
			'folders',
			'notes',
			'highlights',
			'attachments',
			'tags',
			'syncQueue',
			'metadata'
		];

		return new Promise((resolve, reject) => {
			const transaction = this.db!.transaction(storeNames, 'readwrite');

			storeNames.forEach((storeName) => {
				transaction.objectStore(storeName).clear();
			});

			transaction.oncomplete = () => resolve();
			transaction.onerror = () => reject(transaction.error);
		});
	}

    // =================================================================
	// ATTACHMENT OPERATIONS (NEW SECTION)
	// =================================================================

	async getAttachment(id: string): Promise<Attachment | null> {
		return this.get<Attachment>('attachments', id);
	}

	async getAttachmentsByChatId(chatId: string): Promise<Attachment[]> {
		return this.getAll<Attachment>('attachments', 'chatId', chatId);
	}

	async saveAttachment(attachment: Attachment): Promise<void> {
		return this.put('attachments', attachment);
	}

	async deleteAttachment(id: string): Promise<void> {
		return this.delete('attachments', id);
	}

	/**
	 * Close database connection
	 */
	close(): void {
		if (this.db) {
			this.db.close();
			this.db = null;
		}
	}
}

// Singleton instance
export const localDB = new LocalDB();