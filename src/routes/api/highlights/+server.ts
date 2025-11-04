import { json, type RequestHandler } from '@sveltejs/kit';
import { highlightService } from '$lib/server/services/highlight.service';
import type { CreateHighlightDTO } from '$lib/types/highlight';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const messageId = url.searchParams.get('messageId');

		if (!messageId) {
			return json({ message: 'messageId required' }, { status: 400 });
		}

		const highlights = await highlightService.getMessageHighlights(messageId);
		return json({ data: highlights, total: highlights.length });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data: CreateHighlightDTO = await request.json();

		// Validate
		if (
			!data.messageId ||
			!data.text ||
			data.startOffset === undefined ||
			data.endOffset === undefined
		) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		const highlight = await highlightService.createHighlight(data);
		return json(highlight, { status: 201 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
