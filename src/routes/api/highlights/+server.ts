import { json, type RequestHandler } from '@sveltejs/kit';
import { highlightRepository } from '$lib/server/repositories/highlight.repository';
import type { CreateHighlightRequest } from '$lib/types/chat';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const messageId = url.searchParams.get('messageId');
		const messageIds = url.searchParams.get('messageIds');

		if (messageId) {
			const highlights = await highlightRepository.findByMessageId(messageId);
			return json({ success: true, data: highlights });
		}

		if (messageIds) {
			const ids = messageIds.split(',');
			const highlights = await highlightRepository.findByMessageIds(ids);
			return json({ success: true, data: highlights });
		}

		return json({ success: false, error: 'messageId or messageIds required' }, { status: 400 });
	} catch (error) {
		console.error('Error fetching highlights:', error);
		return json({ success: false, error: 'Failed to fetch highlights' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as CreateHighlightRequest;

		if (!body.messageId || !body.text || body.startOffset === undefined || body.endOffset === undefined) {
			return json({ success: false, error: 'messageId, text, startOffset, and endOffset are required' }, { status: 400 });
		}

		const highlight = await highlightRepository.create({
			messageId: body.messageId,
			text: body.text,
			startOffset: body.startOffset,
			endOffset: body.endOffset,
			color: body.color || '#FFFF00',
			note: body.note
		});

		return json({ success: true, data: highlight }, { status: 201 });
	} catch (error) {
		console.error('Error creating highlight:', error);
		return json({ success: false, error: 'Failed to create highlight' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const id = url.searchParams.get('id');

		if (!id) {
			return json({ success: false, error: 'id is required' }, { status: 400 });
		}

		const deleted = await highlightRepository.delete(id);

		if (!deleted) {
			return json({ success: false, error: 'Highlight not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting highlight:', error);
		return json({ success: false, error: 'Failed to delete highlight' }, { status: 500 });
	}
};
