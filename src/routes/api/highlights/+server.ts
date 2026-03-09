import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { highlights, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { messageId, text, note } = await request.json();

	// Verify the message exists before inserting
	const [existingMessage] = await db.select().from(messages).where(eq(messages.id, messageId));
	if (!existingMessage) throw error(404, 'Message not found');

	const [highlight] = await db
		.insert(highlights)
		.values({
			messageId,
			text,
			note: note ?? null
		})
		.returning();

	return json(highlight, { status: 201 });
};
