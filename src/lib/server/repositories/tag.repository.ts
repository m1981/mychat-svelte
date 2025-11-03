import { db } from '$lib/server/db';
import {
	tags,
	chatTags,
	messageTags,
	noteTags,
	type Tag,
	type NewTag
} from '$lib/server/db/schema';
import { eq, and, like, inArray } from 'drizzle-orm';

export class TagRepository {
	/**
	 * Create a new tag
	 */
	async create(data: Omit<NewTag, 'id' | 'createdAt'>): Promise<Tag> {
		const [tag] = await db.insert(tags).values(data).returning();
		return tag;
	}

	/**
	 * Find tag by ID
	 */
	async findById(id: number): Promise<Tag | null> {
		const [tag] = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
		return tag || null;
	}

	/**
	 * Find tag by name and type for a user
	 */
	async findByNameAndType(
		userId: number,
		name: string,
		type: 'CHAT' | 'MESSAGE' | 'NOTE'
	): Promise<Tag | null> {
		const [tag] = await db
			.select()
			.from(tags)
			.where(and(eq(tags.userId, userId), eq(tags.name, name), eq(tags.type, type)))
			.limit(1);
		return tag || null;
	}

	/**
	 * Find all tags for a user
	 */
	async findByUserId(userId: number): Promise<Tag[]> {
		return await db
			.select()
			.from(tags)
			.where(eq(tags.userId, userId))
			.orderBy(tags.name);
	}

	/**
	 * Find tags by type for a user
	 */
	async findByUserIdAndType(
		userId: number,
		type: 'CHAT' | 'MESSAGE' | 'NOTE'
	): Promise<Tag[]> {
		return await db
			.select()
			.from(tags)
			.where(and(eq(tags.userId, userId), eq(tags.type, type)))
			.orderBy(tags.name);
	}

	/**
	 * Search tags by name pattern
	 */
	async searchByName(userId: number, pattern: string): Promise<Tag[]> {
		return await db
			.select()
			.from(tags)
			.where(and(eq(tags.userId, userId), like(tags.name, `%${pattern}%`)))
			.orderBy(tags.name)
			.limit(20);
	}

	/**
	 * Update a tag
	 */
	async update(
		id: number,
		data: Partial<Pick<Tag, 'name' | 'color'>>
	): Promise<Tag | null> {
		const [updated] = await db.update(tags).set(data).where(eq(tags.id, id)).returning();
		return updated || null;
	}

	/**
	 * Delete a tag
	 */
	async delete(id: number): Promise<boolean> {
		const result = await db.delete(tags).where(eq(tags.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	// ============================================
	// Chat Tags
	// ============================================

	/**
	 * Get tags for a chat
	 */
	async getTagsForChat(chatId: string): Promise<Tag[]> {
		const result = await db
			.select({
				id: tags.id,
				userId: tags.userId,
				name: tags.name,
				color: tags.color,
				type: tags.type,
				createdAt: tags.createdAt
			})
			.from(chatTags)
			.innerJoin(tags, eq(chatTags.tagId, tags.id))
			.where(eq(chatTags.chatId, chatId));

		return result;
	}

	/**
	 * Add tag to chat
	 */
	async addTagToChat(chatId: string, tagId: number): Promise<void> {
		await db.insert(chatTags).values({ chatId, tagId }).onConflictDoNothing();
	}

	/**
	 * Remove tag from chat
	 */
	async removeTagFromChat(chatId: string, tagId: number): Promise<void> {
		await db
			.delete(chatTags)
			.where(and(eq(chatTags.chatId, chatId), eq(chatTags.tagId, tagId)));
	}

	// ============================================
	// Message Tags
	// ============================================

	/**
	 * Get tags for a message
	 */
	async getTagsForMessage(messageId: string): Promise<Tag[]> {
		const result = await db
			.select({
				id: tags.id,
				userId: tags.userId,
				name: tags.name,
				color: tags.color,
				type: tags.type,
				createdAt: tags.createdAt
			})
			.from(messageTags)
			.innerJoin(tags, eq(messageTags.tagId, tags.id))
			.where(eq(messageTags.messageId, messageId));

		return result;
	}

	/**
	 * Add tag to message
	 */
	async addTagToMessage(messageId: string, tagId: number): Promise<void> {
		await db.insert(messageTags).values({ messageId, tagId }).onConflictDoNothing();
	}

	/**
	 * Remove tag from message
	 */
	async removeTagFromMessage(messageId: string, tagId: number): Promise<void> {
		await db
			.delete(messageTags)
			.where(and(eq(messageTags.messageId, messageId), eq(messageTags.tagId, tagId)));
	}

	// ============================================
	// Note Tags
	// ============================================

	/**
	 * Get tags for a note
	 */
	async getTagsForNote(noteId: string): Promise<Tag[]> {
		const result = await db
			.select({
				id: tags.id,
				userId: tags.userId,
				name: tags.name,
				color: tags.color,
				type: tags.type,
				createdAt: tags.createdAt
			})
			.from(noteTags)
			.innerJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(noteTags.noteId, noteId));

		return result;
	}

	/**
	 * Add tag to note
	 */
	async addTagToNote(noteId: string, tagId: number): Promise<void> {
		await db.insert(noteTags).values({ noteId, tagId }).onConflictDoNothing();
	}

	/**
	 * Remove tag from note
	 */
	async removeTagFromNote(noteId: string, tagId: number): Promise<void> {
		await db
			.delete(noteTags)
			.where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)));
	}

	/**
	 * Find or create a tag
	 */
	async findOrCreate(
		userId: number,
		name: string,
		type: 'CHAT' | 'MESSAGE' | 'NOTE',
		color?: string
	): Promise<Tag> {
		const existing = await this.findByNameAndType(userId, name, type);
		if (existing) return existing;

		return await this.create({ userId, name, type, color });
	}
}

// Export singleton instance
export const tagRepository = new TagRepository();
