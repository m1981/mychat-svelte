import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { id, title, folderId, modelId } = await event.request.json();
	const userId = await requireUserId(event);

	const [chat] = await db
		.insert(chats)
		.values({
			id,
			userId,
			title: title ?? 'New Chat',
			modelId: modelId ?? 'claude-sonnet-4-6',
			folderId: folderId ?? null,
			tags: []
		})
		.returning();

	return json(chat);
};
