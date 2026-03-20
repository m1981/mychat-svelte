import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { highlights, messages } from '$lib/server/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	await requireUserId(event);
	// Join highlights through messages to get all for this chat
	const chatMessages = await db
		.select({ id: messages.id })
		.from(messages)
		.where(eq(messages.chatId, event.params.id));

	const messageIds = chatMessages.map((m) => m.id);
	if (messageIds.length === 0) return json([]);

	const rows = await db.select().from(highlights).where(inArray(highlights.messageId, messageIds));

	return json(rows);
};
