import { json, type RequestHandler } from '@sveltejs/kit';
import { highlightService } from '$lib/server/services/highlight.service';
import type { UpdateHighlightDTO } from '$lib/types/highlight';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const highlightId = params.id;
		const highlight = await highlightService.getHighlight(highlightId);
		return json(highlight);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message === 'Highlight not found' ? 404 : 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const highlightId = params.id;
		const data: UpdateHighlightDTO = await request.json();

		const highlight = await highlightService.updateHighlight(highlightId, data);
		return json(highlight);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const highlightId = params.id;
		await highlightService.deleteHighlight(highlightId);
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
