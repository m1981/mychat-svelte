import { db } from '$lib/server/db';
import { chats, messages, folders, type Chat, type NewChat, type Message, type NewMessage } from '$lib/server/db/schema';
import { eq, and, like, desc, inArray } from 'drizzle-orm';
import { generateId } from '$lib/server/utils/id-generator';

export class ChatRepository {
	/**
	 * Create a new chat
	 */
	async create(data: Omit<NewChat, 'id' | 'createdAt' | 'updatedAt'>): Promise<Chat> {
		const id = generateId();
		const [chat] = await db
			.insert(chats)
			.values({
				id,
				...data
			})
			.returning();
		return chat;
	}

	/**
	 * Find chat by ID
	 */
	async findById(id: string): Promise<Chat | null> {
		const [chat] = await db.select().from(chats).where(eq(chats.id, id)).limit(1);
		return chat || null;
	}

	/**
	 * Find all chats for a user
	 */
	async findByUserId(userId: number): Promise<Chat[]> {
		return await db
			.select()
			.from(chats)
			.where(eq(chats.userId, userId))
			.orderBy(desc(chats.updatedAt));
	}

	/**
	 * Find chats by folder ID
	 */
	async findByFolderId(folderId: string): Promise<Chat[]> {
		return await db
			.select()
			.from(chats)
			.where(eq(chats.folderId, folderId))
			.orderBy(desc(chats.updatedAt));
	}

	/**
	 * Update a chat
	 */
	async update(
		id: string,
		data: Partial<Pick<Chat, 'title' | 'config' | 'folderId' | 'metadata'>>
	): Promise<Chat | null> {
		const [updated] = await db
			.update(chats)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(chats.id, id))
			.returning();
		return updated || null;
	}

	/**
	 * Delete a chat
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db.delete(chats).where(eq(chats.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Search chats by title
	 */
	async searchByTitle(userId: number, query: string): Promise<Chat[]> {
		return await db
			.select()
			.from(chats)
			.where(and(eq(chats.userId, userId), like(chats.title, `%${query}%`)))
			.orderBy(desc(chats.updatedAt))
			.limit(50);
	}

	// ============================================
	// Message Operations
	// ============================================

	/**
	 * Create a new message
	 */
	async createMessage(data: Omit<NewMessage, 'id' | 'createdAt'>): Promise<Message> {
		const id = generateId();
		const [message] = await db
			.insert(messages)
			.values({
				id,
				...data
			})
			.returning();

		// Update chat's updatedAt timestamp
		await db
			.update(chats)
			.set({ updatedAt: new Date() })
			.where(eq(chats.id, data.chatId));

		return message;
	}

	/**
	 * Get all messages for a chat
	 */
	async getMessages(chatId: string): Promise<Message[]> {
		return await db
			.select()
			.from(messages)
			.where(eq(messages.chatId, chatId))
			.orderBy(messages.createdAt);
	}

	/**
	 * Get a specific message
	 */
	async getMessage(messageId: string): Promise<Message | null> {
		const [message] = await db
			.select()
			.from(messages)
			.where(eq(messages.id, messageId))
			.limit(1);
		return message || null;
	}

	/**
	 * Update message content
	 */
	async updateMessage(messageId: string, content: string): Promise<Message | null> {
		const [updated] = await db
			.update(messages)
			.set({ content })
			.where(eq(messages.id, messageId))
			.returning();
		return updated || null;
	}

	/**
	 * Delete a message
	 */
	async deleteMessage(messageId: string): Promise<boolean> {
		const result = await db.delete(messages).where(eq(messages.id, messageId));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Get chat with messages
	 */
	async getChatWithMessages(chatId: string): Promise<{
		chat: Chat;
		messages: Message[];
	} | null> {
		const chat = await this.findById(chatId);
		if (!chat) return null;

		const chatMessages = await this.getMessages(chatId);

		return {
			chat,
			messages: chatMessages
		};
	}

	// ============================================
	// Folder Operations
	// ============================================

	/**
	 * Move chat to folder
	 */
	async moveToFolder(chatId: string, folderId: string | null): Promise<Chat | null> {
		return await this.update(chatId, { folderId: folderId ?? undefined });
	}

	/**
	 * Get chats count by folder
	 */
	async getChatCountByFolder(folderId: string): Promise<number> {
		const result = await db.select().from(chats).where(eq(chats.folderId, folderId));
		return result.length;
	}
}

// Export singleton instance
export const chatRepository = new ChatRepository();
