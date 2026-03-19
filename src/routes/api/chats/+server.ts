import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { getDefaultUserId } from '$lib/server/db/user';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { id, title, folderId, modelId } = await request.json();
	const userId = await getDefaultUserId();

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
