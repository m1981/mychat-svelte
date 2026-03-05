// File: src/routes/chat/[id]/+page.server.ts
import { db } from '$lib/server/db';
import { messages as messagesTable } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';
import type { Message } from '$lib/types/models';

export const load: PageServerLoad = async ({ params }) => {
	const chatId = params.id;

	// Fetch messages ONLY for the active chat
	const dbMessages = await db.query.messages.findMany({
		where: eq(messagesTable.chatId, chatId),
		orderBy: (messages, { asc }) => [asc(messages.createdAt)]
	});

	const messages: Message[] = dbMessages.map((m) => ({
		...m,
		id: String(m.id)
	}));

	return {
		messages
	};
};