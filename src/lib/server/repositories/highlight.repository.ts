import { db } from '$lib/server/db';
import { highlights, type Highlight, type NewHighlight } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateId } from '$lib/server/utils/id-generator';

export class HighlightRepository {
	/**
	 * Create a new highlight
	 */
	async create(data: Omit<NewHighlight, 'id' | 'createdAt'>): Promise<Highlight> {
		const id = generateId();
		const [highlight] = await db
			.insert(highlights)
			.values({
				id,
				...data
			})
			.returning();
		return highlight;
	}

	/**
	 * Find highlight by ID
	 */
	async findById(id: string): Promise<Highlight | null> {
		const [highlight] = await db
			.select()
			.from(highlights)
			.where(eq(highlights.id, id))
			.limit(1);
		return highlight || null;
	}

	/**
	 * Find all highlights for a message
	 */
	async findByMessageId(messageId: string): Promise<Highlight[]> {
		return await db
			.select()
			.from(highlights)
			.where(eq(highlights.messageId, messageId))
			.orderBy(highlights.startOffset);
	}

	/**
	 * Find all highlights for multiple messages
	 */
	async findByMessageIds(messageIds: string[]): Promise<Highlight[]> {
		if (messageIds.length === 0) return [];

		return await db
			.select()
			.from(highlights)
			.where(inArray(highlights.messageId, messageIds))
			.orderBy(highlights.messageId, highlights.startOffset);
	}

	/**
	 * Update a highlight
	 */
	async update(
		id: string,
		data: Partial<Pick<Highlight, 'text' | 'color' | 'note'>>
	): Promise<Highlight | null> {
		const [updated] = await db
			.update(highlights)
			.set(data)
			.where(eq(highlights.id, id))
			.returning();
		return updated || null;
	}

	/**
	 * Delete a highlight
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db.delete(highlights).where(eq(highlights.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Delete all highlights for a message
	 */
	async deleteByMessageId(messageId: string): Promise<number> {
		const result = await db.delete(highlights).where(eq(highlights.messageId, messageId));
		return result.rowCount ?? 0;
	}

	/**
	 * Check if a highlight overlaps with existing highlights
	 */
	async checkOverlap(
		messageId: string,
		startOffset: number,
		endOffset: number
	): Promise<boolean> {
		const overlapping = await db
			.select()
			.from(highlights)
			.where(
				and(
					eq(highlights.messageId, messageId),
					// Check for any overlap: new range overlaps if it starts before existing ends AND ends after existing starts
					// This is: (newStart < existingEnd) AND (newEnd > existingStart)
				)
			)
			.limit(1);

		// Manual overlap check since Drizzle doesn't support range operators directly
		return overlapping.some(
			(h) => startOffset < h.endOffset && endOffset > h.startOffset
		);
	}
}

// Export singleton instance
export const highlightRepository = new HighlightRepository();
