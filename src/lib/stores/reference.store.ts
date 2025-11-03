import { writable, get } from 'svelte/store';
import type { Reference } from '$lib/types/chat';

/**
 * Store for managing chat/folder references in message composer
 */
export const references = writable<Reference[]>([]);

export function addReference(ref: Reference): void {
	references.update((current) => {
		// Prevent duplicates
		if (current.some((r) => r.id === ref.id)) {
			return current;
		}
		return [...current, ref];
	});
}

export function removeReference(id: string): void {
	references.update((current) => current.filter((ref) => ref.id !== id));
}

export function clearReferences(): void {
	references.set([]);
}

export function hasReferences(): boolean {
	return get(references).length > 0;
}
