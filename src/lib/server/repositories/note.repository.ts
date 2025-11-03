import { db } from '$lib/server/db';
import { notes, noteTags, tags, type Note, type NewNote } from '$lib/server/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { generateId } from '$lib/server/utils/id-generator';

export class NoteRepository {
	/**
	 * Create a new note
	 */
	async create(data: Omit<NewNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<Note> {
		const id = generateId();
		const [note] = await db
			.insert(notes)
			.values({
				id,
				...data
			})
			.returning();
		return note;
	}

	/**
	 * Find note by ID
	 */
	async findById(id: string): Promise<Note | null> {
		const [note] = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
		return note || null;
	}

	/**
	 * Find all notes for a chat
	 */
	async findByChatId(chatId: string): Promise<Note[]> {
		return await db.select().from(notes).where(eq(notes.chatId, chatId)).orderBy(notes.createdAt);
	}

	/**
	 * Find notes by message ID
	 */
	async findByMessageId(messageId: string): Promise<Note[]> {
		return await db
			.select()
			.from(notes)
			.where(eq(notes.messageId, messageId))
			.orderBy(notes.createdAt);
	}

	/**
	 * Update a note
	 */
	async update(
		id: string,
		data: Partial<Pick<Note, 'content' | 'type'>>
	): Promise<Note | null> {
		const [updated] = await db
			.update(notes)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(notes.id, id))
			.returning();
		return updated || null;
	}

	/**
	 * Delete a note
	 */
	async delete(id: string): Promise<boolean> {
		const result = await db.delete(notes).where(eq(notes.id, id));
		return (result.rowCount ?? 0) > 0;
	}

	/**
	 * Add tags to a note
	 */
	async addTags(noteId: string, tagIds: number[]): Promise<void> {
		if (tagIds.length === 0) return;

		const values = tagIds.map((tagId) => ({
			noteId,
			tagId
		}));

		await db.insert(noteTags).values(values).onConflictDoNothing();
	}

	/**
	 * Remove tags from a note
	 */
	async removeTags(noteId: string, tagIds: number[]): Promise<void> {
		if (tagIds.length === 0) return;

		await db
			.delete(noteTags)
			.where(and(eq(noteTags.noteId, noteId), inArray(noteTags.tagId, tagIds)));
	}

	/**
	 * Get all tags for a note
	 */
	async getTagsForNote(noteId: string): Promise<Array<{ id: number; name: string; color: string | null; type: 'CHAT' | 'MESSAGE' | 'NOTE' }>> {
		const result = await db
			.select({
				id: tags.id,
				name: tags.name,
				color: tags.color,
				type: tags.type
			})
			.from(noteTags)
			.innerJoin(tags, eq(noteTags.tagId, tags.id))
			.where(eq(noteTags.noteId, noteId));

		return result;
	}

	/**
	 * Find notes by tag IDs
	 */
	async findByTagIds(tagIds: number[]): Promise<Note[]> {
		if (tagIds.length === 0) return [];

		const result = await db
			.selectDistinct()
			.from(notes)
			.innerJoin(noteTags, eq(notes.id, noteTags.noteId))
			.where(inArray(noteTags.tagId, tagIds));

		return result.map((r) => r.notes);
	}
}

// Export singleton instance
export const noteRepository = new NoteRepository();
