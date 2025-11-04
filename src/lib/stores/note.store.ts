import { writable } from 'svelte/store';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { withErrorHandling } from '$lib/utils/error-handler';
import { toast } from './toast.store';

function createNoteStore() {
	const { subscribe, set, update } = writable<Note[]>([]);

	return {
		subscribe,

		/**
		 * Load notes for a chat
		 */
		async loadByChatId(chatId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/notes?chatId=${chatId}`);
					if (!response.ok) throw new Error('Failed to load notes');

					const data = await response.json();
					set(data.data);
				},
				{
					errorMessage: 'Failed to load notes',
					showToast: true
				}
			);
		},

		/**
		 * Load notes for a message
		 */
		async loadByMessageId(messageId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/notes?messageId=${messageId}`);
					if (!response.ok) throw new Error('Failed to load notes');

					const data = await response.json();
					update((notes) => {
						// Merge with existing notes
						const filtered = notes.filter((n) => n.messageId !== messageId);
						return [...filtered, ...data.data];
					});
				},
				{
					errorMessage: 'Failed to load notes',
					showToast: false // Silent load
				}
			);
		},

		/**
		 * Create a new note
		 */
		async create(data: CreateNoteDTO): Promise<Note | null> {
			return withErrorHandling(
				async () => {
					const response = await fetch('/api/notes', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.message || 'Failed to create note');
					}

					const note = await response.json();

					update((notes) => [...notes, note]);
					toast.success('Note created');

					return note;
				},
				{
					errorMessage: 'Failed to create note',
					showToast: true
				}
			);
		},

		/**
		 * Update a note
		 */
		async update(noteId: string, data: UpdateNoteDTO): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/notes/${noteId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) throw new Error('Failed to update note');

					const updatedNote = await response.json();

					update((notes) => notes.map((n) => (n.id === noteId ? updatedNote : n)));

					toast.success('Note updated');
				},
				{
					errorMessage: 'Failed to update note',
					showToast: true
				}
			);
		},

		/**
		 * Delete a note
		 */
		async delete(noteId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/notes/${noteId}`, {
						method: 'DELETE'
					});

					if (!response.ok) throw new Error('Failed to delete note');

					update((notes) => notes.filter((n) => n.id !== noteId));
					toast.success('Note deleted');
				},
				{
					errorMessage: 'Failed to delete note',
					showToast: true
				}
			);
		},

		/**
		 * Clear all notes
		 */
		clear(): void {
			set([]);
		}
	};
}

export const notes = createNoteStore();
