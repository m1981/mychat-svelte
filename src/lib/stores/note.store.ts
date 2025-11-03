import { writable, derived, get } from 'svelte/store';
import type { Note, CreateNoteRequest, UpdateNoteRequest, ApiResponse } from '$lib/types/chat';

// Store for all notes
export const notes = writable<Note[]>([]);

// Loading state
export const notesLoading = writable(false);

// Error state
export const notesError = writable<string | null>(null);

/**
 * Fetch notes for a specific chat
 */
export async function fetchNotes(chatId: string): Promise<void> {
	notesLoading.set(true);
	notesError.set(null);

	try {
		const response = await fetch(`/api/notes?chatId=${chatId}`);
		const result: ApiResponse<Note[]> = await response.json();

		if (result.success && result.data) {
			notes.set(result.data);
		} else {
			notesError.set(result.error || 'Failed to fetch notes');
		}
	} catch (error) {
		console.error('Error fetching notes:', error);
		notesError.set('Failed to fetch notes');
	} finally {
		notesLoading.set(false);
	}
}

/**
 * Fetch notes for a specific message
 */
export async function fetchNotesByMessageId(messageId: string): Promise<void> {
	notesLoading.set(true);
	notesError.set(null);

	try {
		const response = await fetch(`/api/notes?messageId=${messageId}`);
		const result: ApiResponse<Note[]> = await response.json();

		if (result.success && result.data) {
			// Merge with existing notes
			const currentNotes = get(notes);
			const merged = [...currentNotes];

			result.data.forEach((newNote) => {
				const index = merged.findIndex((n) => n.id === newNote.id);
				if (index === -1) {
					merged.push(newNote);
				} else {
					merged[index] = newNote;
				}
			});

			notes.set(merged);
		} else {
			notesError.set(result.error || 'Failed to fetch notes');
		}
	} catch (error) {
		console.error('Error fetching notes:', error);
		notesError.set('Failed to fetch notes');
	} finally {
		notesLoading.set(false);
	}
}

/**
 * Create a new note
 */
export async function createNote(data: CreateNoteRequest): Promise<Note | null> {
	notesError.set(null);

	try {
		const response = await fetch('/api/notes', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result: ApiResponse<Note> = await response.json();

		if (result.success && result.data) {
			// Add to store
			notes.update((current) => [...current, result.data!]);
			return result.data;
		} else {
			notesError.set(result.error || 'Failed to create note');
			return null;
		}
	} catch (error) {
		console.error('Error creating note:', error);
		notesError.set('Failed to create note');
		return null;
	}
}

/**
 * Update a note
 */
export async function updateNote(data: UpdateNoteRequest): Promise<Note | null> {
	notesError.set(null);

	try {
		const response = await fetch('/api/notes', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result: ApiResponse<Note> = await response.json();

		if (result.success && result.data) {
			// Update in store
			notes.update((current) =>
				current.map((note) => (note.id === result.data!.id ? result.data! : note))
			);
			return result.data;
		} else {
			notesError.set(result.error || 'Failed to update note');
			return null;
		}
	} catch (error) {
		console.error('Error updating note:', error);
		notesError.set('Failed to update note');
		return null;
	}
}

/**
 * Delete a note
 */
export async function deleteNote(id: string): Promise<boolean> {
	notesError.set(null);

	try {
		const response = await fetch(`/api/notes?id=${id}`, {
			method: 'DELETE'
		});

		const result: ApiResponse<void> = await response.json();

		if (result.success) {
			// Remove from store
			notes.update((current) => current.filter((note) => note.id !== id));
			return true;
		} else {
			notesError.set(result.error || 'Failed to delete note');
			return false;
		}
	} catch (error) {
		console.error('Error deleting note:', error);
		notesError.set('Failed to delete note');
		return false;
	}
}

/**
 * Get notes for a specific chat (derived store)
 */
export function notesByChatId(chatId: string) {
	return derived(notes, ($notes) => $notes.filter((note) => note.chatId === chatId));
}

/**
 * Get notes for a specific message (derived store)
 */
export function notesByMessageId(messageId: string) {
	return derived(notes, ($notes) => $notes.filter((note) => note.messageId === messageId));
}

/**
 * Get notes by type (derived store)
 */
export function notesByType(type: 'SCRATCH' | 'SUMMARY' | 'TODO') {
	return derived(notes, ($notes) => $notes.filter((note) => note.type === type));
}
