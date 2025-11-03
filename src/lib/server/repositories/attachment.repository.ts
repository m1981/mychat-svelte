import { db } from '$lib/server/db';
import { attachments, type Attachment, type NewAttachment } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateId } from '$lib/server/utils/id-generator';

export class AttachmentRepository {
	/**
	 * Create a new attachment
	 */
	async create(data: Omit<NewAttachment, 'id' | 'createdAt'>): Promise<Attachment> {
		const id = generateId();
		const [attachment] = await db
			.insert(attachments)
			.values({
				id,
				...data
			})
			.returning();
		return attachment;
	}

	/**
	 * Find attachment by ID
	 */
	async findById(id: string): Promise<Attachment | null> {
		const [attachment] = await db
			.select()
			.from(attachments)
			.where(eq(attachments.id, id))
			.limit(1);
		return attachment || null;
	}

	/**
	 * Find all attachments for a chat
	 */
	async findByChatId(chatId: string): Promise<Attachment[]> {
		return await db
			.select()
			.from(attachments)
			.where(eq(attachments.chatId, chatId))
			.orderBy(attachments.createdAt);
	}

	/**
	 * Find attachments by type
	 */
	async findByChatIdAndType(
		chatId: string,
		type: 'FILE' | 'URL' | 'IMAGE'
	): Promise<Attachment[]> {
		return await db
			.select()
			.from(attachments)
			.where(and(eq(attachments.chatId, chatId), eq(attachments.type, type)))
			.orderBy(attachments.createdAt);
	}

	/**
	 * Update attachment metadata
	 */
	async updateMetadata(
		id: string,
		metadata: Record<string, unknown>
	): Promise<Attachment | null> {
		const [updated] = await db
			.update(attachments)
			.set({ metadata })
			.where(eq(attachments.id, id))
			.returning();
		return updated || null;
	}

	/**
	 * Delete an attachment
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db.delete(attachments).where(eq(attachments.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Delete all attachments for a chat
	 */
	async deleteByChatId(chatId: string): Promise<number> {
		const result = await db.delete(attachments).where(eq(attachments.chatId, chatId));
		return result.rowCount ?? 0;
	}

	/**
	 * Get attachment count for a chat
	 */
	async getCountByChatId(chatId: string): Promise<number> {
		const result = await db
			.select()
			.from(attachments)
			.where(eq(attachments.chatId, chatId));
		return result.length;
	}

	/**
	 * Get attachments by multiple chat IDs
	 */
	async findByChatIds(chatIds: string[]): Promise<Map<string, Attachment[]>> {
		if (chatIds.length === 0) return new Map();

		const results = await db
			.select()
			.from(attachments)
			.where(inArray(attachments.chatId, chatIds))
			.orderBy(attachments.createdAt);

		// Group by chatId
		const grouped = new Map<string, Attachment[]>();
		for (const attachment of results) {
			const existing = grouped.get(attachment.chatId) || [];
			existing.push(attachment);
			grouped.set(attachment.chatId, existing);
		}

		return grouped;
	}
}

// Export singleton instance
export const attachmentRepository = new AttachmentRepository();
