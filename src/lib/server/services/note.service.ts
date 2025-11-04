import { noteRepository } from '$lib/server/repositories/note.repository';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';

export class NoteService {
	/**
	 * Create a new note
	 */
	async createNote(data: CreateNoteDTO): Promise<Note> {
		return noteRepository.create(data);
	}

	/**
	 * Get a note by ID
	 */
	async getNote(noteId: string): Promise<Note> {
		const note = await noteRepository.findById(noteId);
		if (!note) {
			throw new Error('Note not found');
		}
		return note;
	}

	/**
	 * Get all notes for a chat
	 */
	async getChatNotes(chatId: string): Promise<Note[]> {
		return noteRepository.findByChatId(chatId);
	}

	/**
	 * Get all notes for a message
	 */
	async getMessageNotes(messageId: number): Promise<Note[]> {
		return noteRepository.findByMessageId(messageId);
	}

	/**
	 * Update a note
	 */
	async updateNote(noteId: string, data: UpdateNoteDTO): Promise<Note> {
		return noteRepository.update(noteId, data);
	}

	/**
	 * Delete a note
	 */
	async deleteNote(noteId: string): Promise<void> {
		return noteRepository.delete(noteId);
	}
}

// Export singleton instance
export const noteService = new NoteService();
