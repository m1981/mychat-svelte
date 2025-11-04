import { db } from '$lib/server/db';
import { highlights, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { generateId } from './base.repository';

export class HighlightRepository {
	/**
	 * Create a new highlight
	 */
	async create(data: CreateHighlightDTO): Promise<Highlight> {
		// Validate offsets
		await this.validateOffsets(
			parseInt(data.messageId),
			data.startOffset,
			data.endOffset,
			data.text
		);

		const highlightId = generateId('highlight');

		const [highlight] = await db
			.insert(highlights)
			.values({
				id: highlightId,
				messageId: parseInt(data.messageId),
				text: data.text,
				startOffset: data.startOffset,
				endOffset: data.endOffset,
				color: data.color || '#FFFF00',
				note: data.note,
				createdAt: new Date()
			})
			.returning();

		return this.mapToDomain(highlight);
	}

	/**
	 * Find highlight by ID
	 */
	async findById(highlightId: string): Promise<Highlight | null> {
		const result = await db.query.highlights.findFirst({
			where: eq(highlights.id, highlightId)
		});

		return result ? this.mapToDomain(result) : null;
	}

	/**
	 * Find all highlights for a message
	 */
	async findByMessageId(messageId: string): Promise<Highlight[]> {
		const results = await db.query.highlights.findMany({
			where: eq(highlights.messageId, parseInt(messageId))
		});

		return results.map((r) => this.mapToDomain(r));
	}

	/**
	 * Update a highlight
	 */
	async update(highlightId: string, data: UpdateHighlightDTO): Promise<Highlight> {
		const updateData: any = {};

		if (data.color !== undefined) updateData.color = data.color;
		if (data.note !== undefined) updateData.note = data.note;

		await db.update(highlights).set(updateData).where(eq(highlights.id, highlightId));

		const updated = await this.findById(highlightId);
		if (!updated) throw new Error('Highlight not found after update');

		return updated;
	}

	/**
	 * Delete a highlight
	 */
	async delete(highlightId: string): Promise<void> {
		await db.delete(highlights).where(eq(highlights.id, highlightId));
	}

	/**
	 * Validate highlight offsets against message content
	 */
	private async validateOffsets(
		messageId: number,
		startOffset: number,
		endOffset: number,
		text: string
	): Promise<void> {
		const message = await db.query.messages.findFirst({
			where: eq(messages.id, messageId)
		});

		if (!message) {
			throw new Error('Message not found');
		}

		if (startOffset < 0 || endOffset > message.content.length) {
			throw new Error('Invalid offsets: out of bounds');
		}

		if (startOffset >= endOffset) {
			throw new Error('Start offset must be less than end offset');
		}

		const actualText = message.content.substring(startOffset, endOffset);
		if (actualText !== text) {
			throw new Error('Highlight text does not match message content at specified offsets');
		}
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any): Highlight {
		return {
			id: record.id,
			messageId: record.messageId.toString(),
			text: record.text,
			startOffset: record.startOffset,
			endOffset: record.endOffset,
			color: record.color,
			note: record.note,
			createdAt: record.createdAt
		};
	}
}

// Export singleton instance
export const highlightRepository = new HighlightRepository();
