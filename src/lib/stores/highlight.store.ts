import { writable } from 'svelte/store';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { withErrorHandling } from '$lib/utils/error-handler';
import { toast } from './toast.store';

function createHighlightStore() {
	const { subscribe, set, update } = writable<Highlight[]>([]);

	return {
		subscribe,

		/**
		 * Load highlights for a message
		 */
		async loadByMessageId(messageId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/highlights?messageId=${messageId}`);
					if (!response.ok) throw new Error('Failed to load highlights');

					const data = await response.json();
					update((existing) => {
						// Merge with existing highlights from other messages
						const filtered = existing.filter((h) => h.messageId !== messageId);
						return [...filtered, ...data.data];
					});
				},
				{
					errorMessage: 'Failed to load highlights',
					showToast: false // Silent load
				}
			);
		},

		/**
		 * Create a new highlight
		 */
		async create(data: CreateHighlightDTO): Promise<Highlight | null> {
			return withErrorHandling(
				async () => {
					const response = await fetch('/api/highlights', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.message || 'Failed to create highlight');
					}

					const highlight = await response.json();

					update((highlights) => [...highlights, highlight]);
					toast.success('Highlight created');

					return highlight;
				},
				{
					errorMessage: 'Failed to create highlight',
					showToast: true
				}
			);
		},

		/**
		 * Update a highlight
		 */
		async update(highlightId: string, data: UpdateHighlightDTO): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/highlights/${highlightId}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) throw new Error('Failed to update highlight');

					const updatedHighlight = await response.json();

					update((highlights) =>
						highlights.map((h) => (h.id === highlightId ? updatedHighlight : h))
					);

					toast.success('Highlight updated');
				},
				{
					errorMessage: 'Failed to update highlight',
					showToast: true
				}
			);
		},

		/**
		 * Delete a highlight
		 */
		async delete(highlightId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/highlights/${highlightId}`, {
						method: 'DELETE'
					});

					if (!response.ok) throw new Error('Failed to delete highlight');

					update((highlights) => highlights.filter((h) => h.id !== highlightId));
					toast.success('Highlight deleted');
				},
				{
					errorMessage: 'Failed to delete highlight',
					showToast: true
				}
			);
		},

		/**
		 * Clear all highlights
		 */
		clear(): void {
			set([]);
		}
	};
}

export const highlights = createHighlightStore();
