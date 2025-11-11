// src/lib/stores/highlight.store.ts
import { writable } from 'svelte/store';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { browser } from '$app/environment';
import { handleError } from '$lib/utils/error-handler';

function createHighlightStore() {
	const { subscribe, set, update } = writable<Highlight[]>([]);

	return {
		subscribe,

		/**
		 * Load highlights for a message from the local database.
		 */
		async loadByMessageId(messageId: string): Promise<void> {
			if (!browser) return;
			try {
				const localHighlights = await localDB.getHighlightsByMessageId(messageId);
				update((current) => {
					const filtered = current.filter((h) => h.messageId !== messageId);
					return [...filtered, ...localHighlights];
				});
			} catch (error) {
				handleError(error, 'Failed to load highlights from local DB');
			}
		},

		/**
		 * Create a new highlight with a local-first approach.
		 */
		async create(data: CreateHighlightDTO): Promise<Highlight | null> {
			if (!browser) return null;

			const highlightId = `highlight-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const newHighlight: Highlight = {
				id: highlightId,
				messageId: data.messageId,
				text: data.text,
				startOffset: data.startOffset,
				endOffset: data.endOffset,
				color: data.color || '#FFFF00',
				note: data.note,
				createdAt: new Date()
			};

			try {
				await localDB.saveHighlight(newHighlight);
				update((current) => [...current, newHighlight]);
				syncService.queueOperation('CREATE', 'HIGHLIGHT', highlightId, newHighlight);
				toast.success('Highlight created');
				return newHighlight;
			} catch (error) {
				handleError(error, 'Failed to create highlight');
				return null;
			}
		},

		/**
		 * Update a highlight with a local-first approach.
		 */
		async update(highlightId: string, data: UpdateHighlightDTO): Promise<void> {
			if (!browser) return;

			try {
				const highlight = await localDB.getHighlight(highlightId);
				if (!highlight) throw new Error('Highlight not found locally');

				const updatedHighlight: Highlight = { ...highlight, ...data };

				await localDB.saveHighlight(updatedHighlight);
				update((current) =>
					current.map((h) => (h.id === highlightId ? updatedHighlight : h))
				);
				syncService.queueOperation('UPDATE', 'HIGHLIGHT', highlightId, data);
				toast.success('Highlight updated');
			} catch (error) {
				handleError(error, 'Failed to update highlight');
			}
		},

		/**
		 * Delete a highlight with a local-first approach.
		 */
		async delete(highlightId: string): Promise<void> {
			if (!browser) return;

			try {
				await localDB.deleteHighlight(highlightId);
				update((current) => current.filter((h) => h.id !== highlightId));
				syncService.queueOperation('DELETE', 'HIGHLIGHT', highlightId, null);
				toast.success('Highlight deleted');
			} catch (error) {
				handleError(error, 'Failed to delete highlight');
			}
		},

		/**
		 * Clear all highlights from the store.
		 */
		clear(): void {
			set([]);
		}
	};
}

export const highlights = createHighlightStore();