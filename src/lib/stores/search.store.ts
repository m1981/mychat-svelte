import { writable } from 'svelte/store';
import type { SearchQuery, SearchResponse, SearchResult } from '$lib/types/search';
import { withErrorHandling } from '$lib/utils/error-handler';

interface SearchState {
	results: SearchResult[];
	isSearching: boolean;
	query: string;
	took: number;
	total: number;
}

const initialState: SearchState = {
	results: [],
	isSearching: false,
	query: '',
	took: 0,
	total: 0
};

function createSearchStore() {
	const { subscribe, set, update } = writable<SearchState>(initialState);

	return {
		subscribe,

		/**
		 * Perform search
		 */
		async search(query: SearchQuery): Promise<void> {
			// Set loading state
			update((state) => ({
				...state,
				isSearching: true,
				query: query.query || ''
			}));

			const response = await withErrorHandling(
				async () => {
					const res = await fetch('/api/search', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(query)
					});

					if (!res.ok) {
						const error = await res.json();
						throw new Error(error.message || 'Search failed');
					}

					const data: SearchResponse = await res.json();

					update((state) => ({
						...state,
						results: data.results,
						took: data.took,
						total: data.pagination.total,
						isSearching: false
					}));

					return data;
				},
				{
					errorMessage: 'Search failed',
					showToast: true
				}
			);

			// If error occurred, reset loading state
			if (!response) {
				update((state) => ({
					...state,
					isSearching: false
				}));
			}
		},

		/**
		 * Clear search results
		 */
		clear(): void {
			set(initialState);
		}
	};
}

export const search = createSearchStore();
