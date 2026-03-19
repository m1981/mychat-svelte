import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq, inArray, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const { messageId, inclusive = false } = body as { messageId?: string; inclusive?: boolean };
	if (!messageId) throw error(400, 'messageId is required');

	// Load all messages for this chat in order
	const chatMessages = await db
		.select()
		.from(messages)
		.where(eq(messages.chatId, params.id))
		.orderBy(asc(messages.createdAt));

	const pivotIdx = chatMessages.findIndex((m) => m.id === messageId);
	if (pivotIdx === -1) throw error(404, 'Message not found in this chat');

	// inclusive=true  → delete FROM pivot onwards (pivot included)
	// inclusive=false → delete AFTER pivot (pivot kept)
	const toDelete = inclusive ? chatMessages.slice(pivotIdx) : chatMessages.slice(pivotIdx + 1);
	if (toDelete.length === 0) return json({ deleted: 0 });

	await db.delete(messages).where(inArray(messages.id, toDelete.map((m) => m.id)));

	return json({ deleted: toDelete.length });
};
