import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const body = await request.json();

	const [updated] = await db
		.update(chats)
		.set({ ...body, updatedAt: new Date() })
		.where(eq(chats.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Chat not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.delete(chats).where(eq(chats.id, params.id));
	return json({ success: true });
};
