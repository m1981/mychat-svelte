// src/lib/stores/note.store.ts
import { writable } from 'svelte/store';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { browser } from '$app/environment';
import { handleError } from '$lib/utils/error-handler';

function createNoteStore() {
	const { subscribe, set, update } = writable<Note[]>([]);

	async function _loadNotes(loader: Promise<Note[]>, errorMessage: string) {
		if (!browser) return;
		try {
			const localNotes = await loader;
			set(localNotes);
		} catch (error) {
			handleError(error, errorMessage);
			set([]);
		}
	}

	return {
		subscribe,

		/**
		 * Load notes for a chat from the local database.
		 */
		loadByChatId: (chatId: string) =>
			_loadNotes(localDB.getNotesByChatId(chatId), 'Failed to load notes from local DB'),

		/**
		 * Create a new note with a local-first approach.
		 */
		async create(data: CreateNoteDTO): Promise<Note | null> {
			if (!browser) return null;

			const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const now = new Date();

			const newNote: Note = {
				id: noteId,
				chatId: data.chatId,
				messageId: data.messageId,
				type: data.type,
				content: data.content,
				tags: [], // Tags are handled server-side for now
				createdAt: now,
				updatedAt: now
			};

			try {
				await localDB.saveNote(newNote);
				update((current) => [...current, newNote]);
				syncService.queueOperation('CREATE', 'NOTE', noteId, newNote);
				toast.success('Note created');
				return newNote;
			} catch (error) {
				handleError(error, 'Failed to create note');
				return null;
			}
		},

		/**
		 * Update a note with a local-first approach.
		 */
		async update(noteId: string, data: UpdateNoteDTO): Promise<void> {
			if (!browser) return;

			try {
				const note = await localDB.getNote(noteId);
				if (!note) throw new Error('Note not found locally');

				const updatedNote: Note = { ...note, ...data, updatedAt: new Date() };

				await localDB.saveNote(updatedNote);
				update((current) => current.map((n) => (n.id === noteId ? updatedNote : n)));
				syncService.queueOperation('UPDATE', 'NOTE', noteId, data);
				toast.success('Note updated');
			} catch (error) {
				handleError(error, 'Failed to update note');
			}
		},

		/**
		 * Delete a note with a local-first approach.
		 */
		async delete(noteId: string): Promise<void> {
			if (!browser) return;

			try {
				await localDB.deleteNote(noteId);
				update((current) => current.filter((n) => n.id !== noteId));
				syncService.queueOperation('DELETE', 'NOTE', noteId, null);
				toast.success('Note deleted');
			} catch (error) {
				handleError(error, 'Failed to delete note');
			}
		},

		/**
		 * Clear all notes from the store.
		 */
		clear(): void {
			set([]);
		}
	};
}

export const notes = createNoteStore();