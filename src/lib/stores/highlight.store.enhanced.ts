// src/lib/stores/highlight.store.enhanced.ts
/**
 * Enhanced Highlight Store with Local-First Architecture + Event Dispatching
 */

import { writable, get } from 'svelte/store';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { eventBus } from '$lib/events/eventBus'; // New: For pub/sub events
import { browser } from '$app/environment';

// Core store
export const highlights = writable<Highlight[]>([]);

/**
 * Load highlights for a message (local-first)
 */
export async function loadHighlightsByMessageId(messageId: string): Promise<void> {
	if (!browser) return;

	try {
		const localHighlights = await localDB.getHighlightsByMessageId(messageId);

		// Merge with existing highlights from other messages
		highlights.update(current => {
			const filtered = current.filter(h => h.messageId !== messageId);
			return [...filtered, ...localHighlights];
		});
	} catch (error) {
		console.error('Failed to load highlights from local DB:', error);
	}
}

/**
 * Create a new highlight (local-first) + Dispatch Event
 */
export async function createHighlight(data: CreateHighlightDTO): Promise<Highlight | null> {
	if (!browser) return null;

	const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const now = new Date();

	const newHighlight: Highlight = {
		id: highlightId,
		messageId: data.messageId,
		text: data.text,
		startOffset: data.startOffset,
		endOffset: data.endOffset,
		color: data.color || '#FFFF00',
		note: data.note,
		createdAt: now
	};

	try {
		// 1. Save to IndexedDB immediately
		await localDB.saveHighlight(newHighlight);

		// 2. Update store
		highlights.update(current => [...current, newHighlight]);

		// 3. Queue for server sync
		await syncService.queueOperation('CREATE', 'HIGHLIGHT', highlightId, newHighlight);

		// 4. Dispatch custom event
		eventBus.dispatchEvent(new CustomEvent('highlight:created', { detail: newHighlight }));

		toast.success('Highlight created');
		console.log(`✅ Highlight created locally: ${highlightId}`);

		return newHighlight;
	} catch (error) {
		console.error('Failed to create highlight:', error);
		toast.error('Failed to create highlight');
		return null;
	}
}

/**
 * Update a highlight (local-first) + Dispatch Event
 */
export async function updateHighlight(highlightId: string, data: UpdateHighlightDTO): Promise<void> {
	if (!browser) return;

	try {
		// 1. Get current highlight from IndexedDB
		const highlight = await localDB.getHighlight(highlightId);
		if (!highlight) throw new Error('Highlight not found');

		// 2. Apply updates
		const updatedHighlight: Highlight = {
			...highlight,
			...data
		};

		// 3. Save to IndexedDB
		await localDB.saveHighlight(updatedHighlight);

		// 4. Update store
		highlights.update(current =>
			current.map(h => h.id === highlightId ? updatedHighlight : h)
		);

		// 5. Queue for server sync
		await syncService.queueOperation('UPDATE', 'HIGHLIGHT', highlightId, data);

		// 6. Dispatch custom event
		eventBus.dispatchEvent(new CustomEvent('highlight:updated', { detail: updatedHighlight }));

		toast.success('Highlight updated');
		console.log(`✅ Highlight updated locally: ${highlightId}`);
	} catch (error) {
		console.error('Failed to update highlight:', error);
		toast.error('Failed to update highlight');
	}
}

/**
 * Delete a highlight (local-first) + Dispatch Event
 */
export async function deleteHighlight(highlightId: string): Promise<void> {
	if (!browser) return;

	try {
		// 1. Delete from IndexedDB
		await localDB.deleteHighlight(highlightId);

		// 2. Update store
		highlights.update(current => current.filter(h => h.id !== highlightId));

		// 3. Queue for server sync
		await syncService.queueOperation('DELETE', 'HIGHLIGHT', highlightId, null);

		// 4. Dispatch custom event
		eventBus.dispatchEvent(new CustomEvent('highlight:deleted', { detail: { id: highlightId } }));

		toast.success('Highlight deleted');
		console.log(`✅ Highlight deleted locally: ${highlightId}`);
	} catch (error) {
		console.error('Failed to delete highlight:', error);
		toast.error('Failed to delete highlight');
	}
}

/**
 * Clear all highlights
 */
export function clearHighlights(): void {
	highlights.set([]);
}