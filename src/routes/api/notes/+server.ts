import { json, type RequestHandler } from '@sveltejs/kit';
import { noteRepository } from '$lib/server/repositories/note.repository';
import type { CreateNoteRequest, UpdateNoteRequest } from '$lib/types/chat';

/**
 * GET /api/notes?chatId=xxx
 * Get all notes for a chat
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');
		const messageId = url.searchParams.get('messageId');

		if (chatId) {
			const notes = await noteRepository.findByChatId(chatId);

			// Get tags for each note
			const notesWithTags = await Promise.all(
				notes.map(async (note) => ({
					...note,
					tags: await noteRepository.getTagsForNote(note.id)
				}))
			);

			return json({ success: true, data: notesWithTags });
		}

		if (messageId) {
			const notes = await noteRepository.findByMessageId(messageId);

			const notesWithTags = await Promise.all(
				notes.map(async (note) => ({
					...note,
					tags: await noteRepository.getTagsForNote(note.id)
				}))
			);

			return json({ success: true, data: notesWithTags });
		}

		return json({ success: false, error: 'chatId or messageId required' }, { status: 400 });
	} catch (error) {
		console.error('Error fetching notes:', error);
		return json(
			{ success: false, error: 'Failed to fetch notes' },
			{ status: 500 }
		);
	}
};

/**
 * POST /api/notes
 * Create a new note
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as CreateNoteRequest;

		if (!body.chatId || !body.content || !body.type) {
			return json(
				{ success: false, error: 'chatId, content, and type are required' },
				{ status: 400 }
			);
		}

		const note = await noteRepository.create({
			chatId: body.chatId,
			messageId: body.messageId,
			type: body.type,
			content: body.content
		});

		// Add tags if provided
		if (body.tags && body.tags.length > 0) {
			await noteRepository.addTags(note.id, body.tags);
		}

		// Fetch note with tags
		const tags = await noteRepository.getTagsForNote(note.id);

		return json(
			{
				success: true,
				data: { ...note, tags }
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error('Error creating note:', error);
		return json(
			{ success: false, error: 'Failed to create note' },
			{ status: 500 }
		);
	}
};

/**
 * PATCH /api/notes
 * Update a note
 */
export const PATCH: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as UpdateNoteRequest;

		if (!body.id) {
			return json({ success: false, error: 'id is required' }, { status: 400 });
		}

		const updates: Parameters<typeof noteRepository.update>[1] = {};
		if (body.content !== undefined) updates.content = body.content;
		if (body.type !== undefined) updates.type = body.type;

		const note = await noteRepository.update(body.id, updates);

		if (!note) {
			return json({ success: false, error: 'Note not found' }, { status: 404 });
		}

		// Update tags if provided
		if (body.tags !== undefined) {
			// Get existing tags
			const existingTags = await noteRepository.getTagsForNote(note.id);
			const existingTagIds = existingTags.map((t) => t.id);

			// Remove tags that are no longer needed
			const tagsToRemove = existingTagIds.filter((id) => !body.tags?.includes(id));
			if (tagsToRemove.length > 0) {
				await noteRepository.removeTags(note.id, tagsToRemove);
			}

			// Add new tags
			const tagsToAdd = body.tags.filter((id) => !existingTagIds.includes(id));
			if (tagsToAdd.length > 0) {
				await noteRepository.addTags(note.id, tagsToAdd);
			}
		}

		// Fetch note with tags
		const tags = await noteRepository.getTagsForNote(note.id);

		return json({
			success: true,
			data: { ...note, tags }
		});
	} catch (error) {
		console.error('Error updating note:', error);
		return json(
			{ success: false, error: 'Failed to update note' },
			{ status: 500 }
		);
	}
};

/**
 * DELETE /api/notes?id=xxx
 * Delete a note
 */
export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const id = url.searchParams.get('id');

		if (!id) {
			return json({ success: false, error: 'id is required' }, { status: 400 });
		}

		const deleted = await noteRepository.delete(id);

		if (!deleted) {
			return json({ success: false, error: 'Note not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting note:', error);
		return json(
			{ success: false, error: 'Failed to delete note' },
			{ status: 500 }
		);
	}
};
