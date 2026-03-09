// File: src/routes/chat/[id]/+page.server.ts
import { db } from '$lib/server/db';
import { messages as messagesTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const chatId = params.id;

	// Fetch messages ONLY for the active chat
	const dbMessages = await db.query.messages.findMany({
		where: eq(messagesTable.chatId, chatId),
		orderBy: (messages, { asc }) => [asc(messages.createdAt)]
	});

	// Map database rows to the current AI SDK UIMessage shape.
	const messages = dbMessages.map((m) => ({
		id: String(m.id),
		role: m.role as 'user' | 'assistant' | 'system',
		parts: [{ type: 'text' as const, text: m.content }]
	}));

	return {
		messages
	};
};