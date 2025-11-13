// src/lib/services/local-db.ts
import Dexie, { type Table } from 'dexie';
import type { Chat, Folder, Tag } from '$lib/types/chat';
import type { Note } from '$lib/types/note';
import type { Highlight } from '$lib/types/highlight';
import type { Attachment } from '$lib/types/attachment';

// This is the same interface as before
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

// 1. Define your database schema using Dexie's syntax.
// This class IS your database connection.
export class BetterChatGptDB extends Dexie {
    // 2. Declare your tables (object stores) with their types.
	chats!: Table<Chat>;
	folders!: Table<Folder>;
	notes!: Table<Note>;
	highlights!: Table<Highlight>;
	attachments!: Table<Attachment>;
	tags!: Table<Tag>;
	syncQueue!: Table<SyncOperation>;
	metadata!: Table<{ key: string; value: any }, string>; // Table<Type, KeyType>

	constructor() {
		super('better-chatgpt-db'); // The database name
		this.version(1).stores({
            // 3. Define the schema. `id` is the primary key. `&` means unique.
            // `*` means multi-entry index (for arrays). `++` is auto-incrementing.
            // The syntax is "primaryKey, index1, index2, ..."
			chats: 'id, userId, folderId, updatedAt',
			folders: 'id, userId, parentId',
			notes: 'id, chatId, messageId',
			highlights: 'id, messageId',
			attachments: 'id, chatId',
			tags: 'id, userId, type',
			syncQueue: 'id, timestamp, entity',
			metadata: 'key' // Simple key-value store
		});
	}
}

// Create a singleton instance of the Dexie database
const dexieDB = new BetterChatGptDB();

// 4. Create a new LocalDB class that USES the Dexie instance.
// Its job is to provide the same API as your old class, but with a much simpler implementation.
export class LocalDB {
	// Dexie handles initialization automatically. The `init` method is no longer needed
    // but we can keep a no-op one for compatibility if your app calls it.
	async init(): Promise<void> {
        // Dexie opens the DB on the first query, so this can be empty.
		return Promise.resolve();
	}

	// =================================================================
	// CHAT OPERATIONS (Now trivial one-liners)
	// =================================================================

	async getChat(id: string): Promise<Chat | null> {
		return (await dexieDB.chats.get(id)) || null;
	}

	async getAllChats(userId?: number, folderId?: string): Promise<Chat[]> {
		if (folderId) {
			return dexieDB.chats.where('folderId').equals(folderId).toArray();
		}
		if (userId) {
			return dexieDB.chats.where('userId').equals(userId).toArray();
		}
		return dexieDB.chats.toArray();
	}

	async saveChat(chat: Chat): Promise<void> {
		await dexieDB.chats.put(chat);
	}

	async deleteChat(id: string): Promise<void> {
		await dexieDB.chats.delete(id);
	}

	// =================================================================
	// FOLDER OPERATIONS (Also trivial)
	// =================================================================

	async getFolder(id: string): Promise<Folder | null> {
		return (await dexieDB.folders.get(id)) || null;
	}

	async getAllFolders(userId?: number): Promise<Folder[]> {
		if (userId) {
			return dexieDB.folders.where('userId').equals(userId).toArray();
		}
		return dexieDB.folders.toArray();
	}

	async saveFolder(folder: Folder): Promise<void> {
		await dexieDB.folders.put(folder);
	}

	async deleteFolder(id: string): Promise<void> {
		await dexieDB.folders.delete(id);
	}

	// =================================================================
	// NOTE OPERATIONS
	// =================================================================

	async getNote(id: string): Promise<Note | null> {
		return (await dexieDB.notes.get(id)) || null;
	}

	async getNotesByChatId(chatId: string): Promise<Note[]> {
		return dexieDB.notes.where('chatId').equals(chatId).toArray();
	}

	async saveNote(note: Note): Promise<void> {
		await dexieDB.notes.put(note);
	}

	async deleteNote(id: string): Promise<void> {
		await dexieDB.notes.delete(id);
	}

	// =================================================================
	// HIGHLIGHT OPERATIONS
	// =================================================================

	async getHighlight(id: string): Promise<Highlight | null> {
		return (await dexieDB.highlights.get(id)) || null;
	}

	async getHighlightsByMessageId(messageId: string): Promise<Highlight[]> {
		return dexieDB.highlights.where('messageId').equals(messageId).toArray();
	}

	async saveHighlight(highlight: Highlight): Promise<void> {
		await dexieDB.highlights.put(highlight);
	}

	async deleteHighlight(id: string): Promise<void> {
		await dexieDB.highlights.delete(id);
	}

	// =================================================================
	// ATTACHMENT OPERATIONS
	// =================================================================

	async getAttachment(id: string): Promise<Attachment | null> {
		return (await dexieDB.attachments.get(id)) || null;
	}

	async getAttachmentsByChatId(chatId: string): Promise<Attachment[]> {
		return dexieDB.attachments.where('chatId').equals(chatId).toArray();
	}

	async saveAttachment(attachment: Attachment): Promise<void> {
		await dexieDB.attachments.put(attachment);
	}

	async deleteAttachment(id: string): Promise<void> {
		await dexieDB.attachments.delete(id);
	}

	// =================================================================
	// TAG OPERATIONS
	// =================================================================

	async getTag(id: string): Promise<Tag | null> {
		return (await dexieDB.tags.get(id)) || null;
	}

	async getAllTags(userId?: number): Promise<Tag[]> {
		if (userId) {
			return dexieDB.tags.where('userId').equals(userId).toArray();
		}
		return dexieDB.tags.toArray();
	}

	async saveTag(tag: Tag): Promise<void> {
		await dexieDB.tags.put(tag);
	}

	async deleteTag(id: string): Promise<void> {
		await dexieDB.tags.delete(id);
	}

	// =================================================================
	// SYNC QUEUE OPERATIONS
	// =================================================================

	async addToSyncQueue(operation: Omit<SyncOperation, 'id'>): Promise<void> {
		const op: SyncOperation = {
			...operation,
			id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
		};
		await dexieDB.syncQueue.put(op);
	}

	async getSyncQueue(): Promise<SyncOperation[]> {
        // Dexie provides powerful sorting capabilities out of the box!
		return dexieDB.syncQueue.orderBy('timestamp').toArray();
	}

	async removeFromSyncQueue(id: string): Promise<void> {
		await dexieDB.syncQueue.delete(id);
	}

	async updateSyncOperation(operation: SyncOperation): Promise<void> {
		await dexieDB.syncQueue.put(operation);
	}

	async clearSyncQueue(): Promise<void> {
		await dexieDB.syncQueue.clear();
	}

	// =================================================================
	// METADATA OPERATIONS
	// =================================================================

	async getMetadata(key: string): Promise<any> {
		return (await dexieDB.metadata.get(key))?.value || null;
	}

	async setMetadata(key: string, value: any): Promise<void> {
		await dexieDB.metadata.put({ key, value });
	}

	async getLastSyncTime(): Promise<Date | null> {
		const result = await this.getMetadata('lastSyncTime');
		return result ? new Date(result) : null;
	}

	async setLastSyncTime(time: Date): Promise<void> {
		await this.setMetadata('lastSyncTime', time.toISOString());
	}

	// =================================================================
	// BULK OPERATIONS
	// =================================================================

	async clearAll(): Promise<void> {
        // Dexie transactions are much cleaner for bulk operations.
		await dexieDB.transaction('rw', dexieDB.tables, async () => {
			for (const table of dexieDB.tables) {
				await table.clear();
			}
		});
	}

	close(): void {
		dexieDB.close();
	}
}

// Singleton instance (same as before)
export const localDB = new LocalDB();