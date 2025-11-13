// src/lib/stores/note.store.ts
import { browser } from '$app/environment';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { handleError } from '$lib/utils/error-handler';
import { toast } from './toast.store';

/**
 * Creates a dedicated, reactive note manager for a specific chat.
 * This is NOT a singleton store. Each component instance gets its own manager.
 * @param chatId The ID of the chat to manage notes for.
 */
export function createNoteManager(chatId: string) {
	let notes = $state<Note[]>([]);
	let isLoaded = $state(false);

	async function load() {
		if (!browser) return;
		try {
			const localNotes = await localDB.getNotesByChatId(chatId);
			notes = localNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
			isLoaded = true;
		} catch (error) {
			handleError(error, 'Failed to load notes');
			notes = [];
		}
	}

	async function create(data: Omit<CreateNoteDTO, 'chatId'>): Promise<Note | null> {
			if (!browser) return null;

			const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const now = new Date();

			const newNote: Note = {
				id: noteId,
			chatId, // ChatId is from the factory function's scope
				messageId: data.messageId,
				type: data.type,
				content: data.content,
			tags: [],
				createdAt: now,
				updatedAt: now
			};

			try {
				await localDB.saveNote(newNote);
			notes.push(newNote); // ✅ Rune-based mutation
				syncService.queueOperation('CREATE', 'NOTE', noteId, newNote);
				toast.success('Note created');
				return newNote;
			} catch (error) {
				handleError(error, 'Failed to create note');
				return null;
			}
	}

	async function update(noteId: string, data: UpdateNoteDTO): Promise<void> {
		const noteIndex = notes.findIndex((n) => n.id === noteId);
		if (noteIndex === -1) {
			handleError(new Error('Note not found for updating'), 'Failed to update note');
			return;
		}

		const updatedNote: Note = { ...notes[noteIndex], ...data, updatedAt: new Date() };

			try {
				await localDB.saveNote(updatedNote);
			notes[noteIndex] = updatedNote; // ✅ Rune-based mutation
				syncService.queueOperation('UPDATE', 'NOTE', noteId, data);
				toast.success('Note updated');
			} catch (error) {
				handleError(error, 'Failed to update note');
			}
	}

	async function deleteNote(noteId: string): Promise<void> {
			try {
				await localDB.deleteNote(noteId);
			notes = notes.filter((n) => n.id !== noteId); // ✅ Rune-based mutation
				syncService.queueOperation('DELETE', 'NOTE', noteId, null);
				toast.success('Note deleted');
			} catch (error) {
				handleError(error, 'Failed to delete note');
			}
	}

	// Initial load when the manager is created
	load();

	// Public API for the component to use
	return {
		get notes() {
			return notes;
		},
		get isLoaded() {
			return isLoaded;
		},
		create,
		update,
		delete: deleteNote
	};
}