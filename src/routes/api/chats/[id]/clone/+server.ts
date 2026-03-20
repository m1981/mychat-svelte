import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats, messages } from '$lib/server/db/schema';
import { eq, asc, and } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	const { upToMessageId } = await event.request.json();
	if (!upToMessageId) throw error(400, 'upToMessageId is required');

	// 1. Load source chat
	const [sourceChat] = await db.select().from(chats).where(and(eq(chats.id, event.params.id), eq(chats.userId, userId)));
	if (!sourceChat) throw error(404, 'Chat not found');

	// 2. Find the target message to get its createdAt timestamp
	const [targetMessage] = await db
		.select()
		.from(messages)
		.where(eq(messages.id, upToMessageId));
	if (!targetMessage) throw error(404, 'Message not found');

	// 3. Fetch all messages up to and including the target (by createdAt, then id for ties)
	const sourceMessages = await db
		.select()
		.from(messages)
		.where(eq(messages.chatId, event.params.id))
		.orderBy(asc(messages.createdAt));

	// Slice to include only up to the target message
	const targetIdx = sourceMessages.findIndex((m) => m.id === upToMessageId);
	if (targetIdx === -1) throw error(400, 'upToMessageId does not belong to this chat');
	const messagesToCopy = sourceMessages.slice(0, targetIdx + 1);

	// 4. Create new chat + copy messages in a transaction
	const newChatId = createId();
	const now = new Date();

	const [newChat] = await db
		.insert(chats)
		.values({
			id: newChatId,
			userId: sourceChat.userId,
			folderId: sourceChat.folderId,
			title: `${sourceChat.title} (clone)`,
			modelId: sourceChat.modelId,
			tags: sourceChat.tags,
			createdAt: now,
			updatedAt: now
		})
		.returning();

	if (messagesToCopy.length > 0) {
		await db.insert(messages).values(
			messagesToCopy.map((m) => ({
				id: createId(),
				chatId: newChatId,
				role: m.role,
				content: m.content,
				embedding: m.embedding,
				createdAt: m.createdAt
			}))
		);
	}

	return json(newChat, { status: 201 });
};
