import { json, type RequestHandler } from '@sveltejs/kit';
import { noteService } from '$lib/server/services/note.service';
import type { CreateNoteDTO } from '$lib/types/note';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');
		const messageId = url.searchParams.get('messageId');

		if (chatId) {
			const notes = await noteService.getChatNotes(chatId);
			return json({ data: notes, total: notes.length });
		}

		if (messageId) {
			const notes = await noteService.getMessageNotes(parseInt(messageId));
			return json({ data: notes, total: notes.length });
		}

		return json({ message: 'chatId or messageId required' }, { status: 400 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: CreateNoteDTO = await request.json();

		// Validate
		if (!data.chatId || !data.content) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		const note = await noteService.createNote(data);
		return json(note, { status: 201 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
