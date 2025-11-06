// src/lib/stores/note.store.enhanced.ts
/**
 * Enhanced Note Store with Local-First Architecture + Event Dispatching
 */

import { writable, get } from 'svelte/store';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { eventBus } from '$lib/events/eventBus'; // New: For pub/sub events
import { browser } from '$app/environment';

// Core store
export const notes = writable<Note[]>([]);

/**
 * Load notes for a chat (local-first)
 */
export async function loadNotesByChatId(chatId: string): Promise<void> {
	if (!browser) return;

	try {
		const localNotes = await localDB.getNotesByChatId(chatId);
		notes.set(localNotes);
	} catch (error) {
		console.error('Failed to load notes from local DB:', error);
		notes.set([]);
	}
}

/**
 * Create a new note (local-first) + Dispatch Event
 */
export async function createNote(data: CreateNoteDTO): Promise<Note | null> {
	if (!browser) return null;

	const noteId = `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const now = new Date();

	const newNote: Note = {
		id: noteId,
		chatId: data.chatId,
		messageId: data.messageId,
		type: data.type,
		content: data.content,
		tags: data.tags || [],
		createdAt: now,
		updatedAt: now
	};

	try {
		// 1. Save to IndexedDB immediately
		await localDB.saveNote(newNote);

		// 2. Update store
		notes.update(current => [...current, newNote]);

		// 3. Queue for server sync
		await syncService.queueOperation('CREATE', 'NOTE', noteId, newNote);

		// 4. Dispatch custom event for extensibility (e.g., analytics in +layout.svelte)
		eventBus.dispatchEvent(new CustomEvent('note:created', { detail: newNote }));

		toast.success('Note created');
		console.log(`✅ Note created locally: ${noteId}`);

		return newNote;
	} catch (error) {
		console.error('Failed to create note:', error);
		toast.error('Failed to create note');
		return null;
	}
}

/**
 * Update a note (local-first) + Dispatch Event
 */
export async function updateNote(noteId: string, data: UpdateNoteDTO): Promise<void> {
	if (!browser) return;

	try {
		// 1. Get current note from IndexedDB
		const note = await localDB.getNote(noteId);
		if (!note) throw new Error('Note not found');

		// 2. Apply updates
		const updatedNote: Note = {
			...note,
			...data,
			updatedAt: new Date()
		};

		// 3. Save to IndexedDB
		await localDB.saveNote(updatedNote);

		// 4. Update store
		notes.update(current =>
			current.map(n => n.id === noteId ? updatedNote : n)
		);

		// 5. Queue for server sync
		await syncService.queueOperation('UPDATE', 'NOTE', noteId, data);

		// 6. Dispatch custom event
		eventBus.dispatchEvent(new CustomEvent('note:updated', { detail: updatedNote }));

		toast.success('Note updated');
		console.log(`✅ Note updated locally: ${noteId}`);
	} catch (error) {
		console.error('Failed to update note:', error);
		toast.error('Failed to update note');
	}
}

/**
 * Delete a note (local-first) + Dispatch Event
 */
export async function deleteNote(noteId: string): Promise<void> {
	if (!browser) return;

	try {
		// 1. Delete from IndexedDB
		await localDB.deleteNote(noteId);

		// 2. Update store
		notes.update(current => current.filter(n => n.id !== noteId));

		// 3. Queue for server sync
		await syncService.queueOperation('DELETE', 'NOTE', noteId, null);

		// 4. Dispatch custom event
		eventBus.dispatchEvent(new CustomEvent('note:deleted', { detail: { id: noteId } }));

		toast.success('Note deleted');
		console.log(`✅ Note deleted locally: ${noteId}`);
	} catch (error) {
		console.error('Failed to delete note:', error);
		toast.error('Failed to delete note');
	}
}

/**
 * Clear all notes
 */
export function clearNotes(): void {
	notes.set([]);
}