// src/routes/api/sidebar/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { noteService } from '$lib/server/services/note.service';
import { attachmentService } from '$lib/server/services/attachment.service';
import { db } from '$lib/server/db';
import { highlights, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Aggregated sidebar data endpoint
 * Returns all sidebar data in one request to reduce round trips
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');

		if (!chatId) {
			return json({ message: 'chatId required' }, { status: 400 });
		}

		// Fetch all data in parallel
		const [notes, attachments, chatHighlights] = await Promise.all([
			noteService.getChatNotes(chatId),
			attachmentService.getChatAttachments(chatId),
			// Get highlights for all messages in this chat
			db
				.select({
					id: highlights.id,
					messageId: highlights.messageId,
					text: highlights.text,
					startOffset: highlights.startOffset,
					endOffset: highlights.endOffset,
					color: highlights.color,
					note: highlights.note,
					createdAt: highlights.createdAt
				})
				.from(highlights)
				.innerJoin(messages, eq(messages.id, highlights.messageId))
				.where(eq(messages.chatId, chatId))
		]);

		// Group highlights by color for easier UI rendering
		const highlightsByColor = chatHighlights.reduce((acc, h) => {
			const color = h.color || '#FFFF00';
			if (!acc[color]) acc[color] = [];
			acc[color].push({
				id: h.id,
				messageId: h.messageId.toString(),
				text: h.text,
				startOffset: h.startOffset,
				endOffset: h.endOffset,
				color: h.color,
				note: h.note,
				createdAt: h.createdAt
			});
			return acc;
		}, {} as Record<string, any[]>);

		return json({
			highlights: chatHighlights.map(h => ({
				id: h.id,
				messageId: h.messageId.toString(),
				text: h.text,
				startOffset: h.startOffset,
				endOffset: h.endOffset,
				color: h.color,
				note: h.note,
				createdAt: h.createdAt
			})),
			highlightsByColor,
			notes,
			attachments,
			stats: {
				highlightCount: chatHighlights.length,
				noteCount: notes.length,
				attachmentCount: attachments.length,
				colorCount: Object.keys(highlightsByColor).length
			}
		});
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};