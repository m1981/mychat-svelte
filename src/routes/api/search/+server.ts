import { json, type RequestHandler } from '@sveltejs/kit';
import { searchService } from '$lib/server/services/search.service';
import type { SearchQuery } from '$lib/types/search';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const query: SearchQuery = await request.json();

		// Validate
		if (!query.mode) {
			return json({ message: 'Search mode required' }, { status: 400 });
		}

		// TODO: Get actual userId from session
		const userId = 1;

		const response = await searchService.search(query, userId);
		return json(response);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
