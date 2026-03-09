import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { getDefaultUserId } from '$lib/server/db/user';
import type { RequestHandler } from './$types';

const DEFAULT_CHAT_MODEL_ID = 'claude-sonnet-4-6';

export const POST: RequestHandler = async ({ request }) => {
	const { id, title, folderId, modelId } = await request.json();
	const userId = await getDefaultUserId();

	const [chat] = await db
		.insert(chats)
		.values({
			id,
			userId,
			title: title ?? 'New Chat',
			// Keep runtime chat creation aligned with the Anthropic model used for chat responses.
			modelId: modelId ?? DEFAULT_CHAT_MODEL_ID,
			folderId: folderId ?? null,
			tags: []
		})
		.returning();

	return json(chat);
};
