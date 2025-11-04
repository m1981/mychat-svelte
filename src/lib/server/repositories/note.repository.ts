import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { generateId } from './base.repository';

export class NoteRepository {
	/**
	 * Create a new note
	 */
	async create(data: CreateNoteDTO): Promise<Note> {
		const noteId = generateId('note');

		const [note] = await db
			.insert(notes)
			.values({
				id: noteId,
				chatId: data.chatId,
				messageId: data.messageId ? parseInt(data.messageId) : null,
				type: data.type,
				content: data.content,
				createdAt: new Date(),
				updatedAt: new Date()
			})
			.returning();

		// Handle tags
		if (data.tags && data.tags.length > 0) {
			await this.updateTags(noteId, data.tags);
		}

		return this.mapToDomain(note, []);
	}

	/**
	 * Find note by ID
	 */
	async findById(noteId: string): Promise<Note | null> {
		const result = await db.query.notes.findFirst({
			where: eq(notes.id, noteId),
			with: {
				noteTags: {
					with: { tag: true }
				}
			}
		});

		if (!result) return null;

		return this.mapToDomain(result, result.noteTags?.map((nt) => nt.tag) || []);
	}

	/**
	 * Find all notes for a chat
	 */
	async findByChatId(chatId: string): Promise<Note[]> {
		const results = await db.query.notes.findMany({
			where: eq(notes.chatId, chatId),
			with: {
				noteTags: {
					with: { tag: true }
				}
			}
		});

		return results.map((r) => this.mapToDomain(r, r.noteTags?.map((nt) => nt.tag) || []));
	}

	/**
	 * Find all notes for a message
	 */
	async findByMessageId(messageId: number): Promise<Note[]> {
		const results = await db.query.notes.findMany({
			where: eq(notes.messageId, messageId),
			with: {
				noteTags: {
					with: { tag: true }
				}
			}
		});

		return results.map((r) => this.mapToDomain(r, r.noteTags?.map((nt) => nt.tag) || []));
	}

	/**
	 * Update a note
	 */
	async update(noteId: string, data: UpdateNoteDTO): Promise<Note> {
		const updateData: any = {
			updatedAt: new Date()
		};

		if (data.content !== undefined) updateData.content = data.content;
		if (data.type !== undefined) updateData.type = data.type;

		await db.update(notes).set(updateData).where(eq(notes.id, noteId));

		if (data.tags) {
			await this.updateTags(noteId, data.tags);
		}

		const updated = await this.findById(noteId);
		if (!updated) throw new Error('Note not found after update');

		return updated;
	}

	/**
	 * Delete a note
	 */
	async delete(noteId: string): Promise<void> {
		await db.delete(notes).where(eq(notes.id, noteId));
	}

	/**
	 * Update note tags
	 */
	private async updateTags(noteId: string, tagNames: string[]): Promise<void> {
		// Delete existing tags
		await db.delete(noteTags).where(eq(noteTags.noteId, noteId));

		if (tagNames.length === 0) return;

		// Find or create tags
		const tagRecords = await Promise.all(
			tagNames.map(async (name) => {
				const existing = await db.query.tags.findFirst({
					where: and(eq(tags.name, name), eq(tags.type, 'NOTE'))
				});

				if (existing) return existing;

				const [newTag] = await db
					.insert(tags)
					.values({
						name,
						type: 'NOTE',
						createdAt: new Date()
					})
					.returning();

				return newTag;
			})
		);

		// Create associations
		await db.insert(noteTags).values(
			tagRecords.map((tag) => ({
				noteId,
				tagId: tag.id,
				createdAt: new Date()
			}))
		);
	}

	/**
	 * Map database record to domain model
	 */
	private mapToDomain(record: any, tagsData: any[]): Note {
		return {
			id: record.id,
			chatId: record.chatId,
			messageId: record.messageId?.toString(),
			type: record.type,
			content: record.content,
			tags: tagsData.map((t) => ({
				id: t.id.toString(),
				name: t.name,
				color: t.color,
				type: t.type,
				createdAt: t.createdAt
			})),
			createdAt: record.createdAt,
			updatedAt: record.updatedAt
		};
	}
}

// Export singleton instance
export const noteRepository = new NoteRepository();
