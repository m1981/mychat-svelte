import { writable, derived } from 'svelte/store';
import type { Highlight, CreateHighlightRequest, ApiResponse } from '$lib/types/chat';

export const highlights = writable<Highlight[]>([]);
export const highlightsLoading = writable(false);
export const highlightsError = writable<string | null>(null);

export async function fetchHighlights(messageId: string): Promise<void> {
	highlightsLoading.set(true);
	highlightsError.set(null);

	try {
		const response = await fetch(`/api/highlights?messageId=${messageId}`);
		const result: ApiResponse<Highlight[]> = await response.json();

		if (result.success && result.data) {
			highlights.update((current) => {
				const filtered = current.filter((h) => h.messageId !== messageId);
				return [...filtered, ...result.data!];
			});
		} else {
			highlightsError.set(result.error || 'Failed to fetch highlights');
		}
	} catch (error) {
		console.error('Error fetching highlights:', error);
		highlightsError.set('Failed to fetch highlights');
	} finally {
		highlightsLoading.set(false);
	}
}

export async function createHighlight(data: CreateHighlightRequest): Promise<Highlight | null> {
	highlightsError.set(null);

	try {
		const response = await fetch('/api/highlights', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result: ApiResponse<Highlight> = await response.json();

		if (result.success && result.data) {
			highlights.update((current) => [...current, result.data!]);
			return result.data;
		} else {
			highlightsError.set(result.error || 'Failed to create highlight');
			return null;
		}
	} catch (error) {
		console.error('Error creating highlight:', error);
		highlightsError.set('Failed to create highlight');
		return null;
	}
}

export async function deleteHighlight(id: string): Promise<boolean> {
	highlightsError.set(null);

	try {
		const response = await fetch(`/api/highlights?id=${id}`, { method: 'DELETE' });
		const result: ApiResponse<void> = await response.json();

		if (result.success) {
			highlights.update((current) => current.filter((h) => h.id !== id));
			return true;
		} else {
			highlightsError.set(result.error || 'Failed to delete highlight');
			return false;
		}
	} catch (error) {
		console.error('Error deleting highlight:', error);
		highlightsError.set('Failed to delete highlight');
		return false;
	}
}

export function highlightsByMessageId(messageId: string) {
	return derived(highlights, ($highlights) =>
		$highlights.filter((h) => h.messageId === messageId)
	);
}
