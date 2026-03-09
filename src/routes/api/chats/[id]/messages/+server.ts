import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { messages } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const rows = await db
		.select()
		.from(messages)
		.where(eq(messages.chatId, params.id))
		.orderBy(asc(messages.createdAt));

	return json(rows);
};
