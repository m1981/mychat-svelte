import { db } from '$lib/server/db';
import { attachments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Attachment, CreateAttachmentDTO } from '$lib/types/attachment';
import { generateId } from './base.repository';

export class AttachmentRepository {
	/**
	 * Create a new attachment
	 */
	async create(data: CreateAttachmentDTO): Promise<Attachment> {
		const attachmentId = generateId('attachment');

		const [attachment] = await db
			.insert(attachments)
			.values({
				id: attachmentId,
				chatId: data.chatId,
				type: data.type,
				content: data.content,
				metadata: data.metadata || {},
				createdAt: new Date()
			})
			.returning();

		return this.mapToDomain(attachment);
	}

	/**
	 * Find attachment by ID
	 */
	async findById(attachmentId: string): Promise<Attachment | null> {
		const result = await db.query.attachments.findFirst({
			where: eq(attachments.id, attachmentId)
		});

		return result ? this.mapToDomain(result) : null;
	}

	/**
	 * Find all attachments for a chat
	 */
	async findByChatId(chatId: string): Promise<Attachment[]> {
		const results = await db.query.attachments.findMany({
			where: eq(attachments.chatId, chatId)
		});

		return results.map((r) => this.mapToDomain(r));
	}

	/**
	 * Delete an attachment
	 */
	async delete(attachmentId: string): Promise<void> {
		await db.delete(attachments).where(eq(attachments.id, attachmentId));
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any): Attachment {
		return {
			id: record.id,
			chatId: record.chatId,
			type: record.type,
			content: record.content,
			metadata: record.metadata || {},
			createdAt: record.createdAt
		};
	}
}

// Export singleton instance
export const attachmentRepository = new AttachmentRepository();
