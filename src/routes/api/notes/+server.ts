import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	await requireUserId(event);
	const { chatId, content, tags } = await event.request.json();

	const [note] = await db
		.insert(notes)
		.values({
			chatId,
			content,
			tags: tags ?? []
		})
		.returning();

	return json(note, { status: 201 });
};

export const GET: RequestHandler = async (event) => {
	await requireUserId(event);
	const { url } = event;
	const chatId = url.searchParams.get('chatId');

	if (!chatId) {
		return json([]);
	}

	const result = await db.select().from(notes).where(eq(notes.chatId, chatId));
	return json(result);
};
