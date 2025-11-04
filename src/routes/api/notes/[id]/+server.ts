import { json, type RequestHandler } from '@sveltejs/kit';
import { noteService } from '$lib/server/services/note.service';
import type { UpdateNoteDTO } from '$lib/types/note';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const noteId = params.id;
		const note = await noteService.getNote(noteId);
		return json(note);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message === 'Note not found' ? 404 : 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const noteId = params.id;
		const data: UpdateNoteDTO = await request.json();

		const note = await noteService.updateNote(noteId, data);
		return json(note);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const noteId = params.id;
		await noteService.deleteNote(noteId);
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
