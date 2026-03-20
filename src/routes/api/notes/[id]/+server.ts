import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	await requireUserId(event);
	const { content } = await event.request.json();

	const [updated] = await db
		.update(notes)
		.set({ content, updatedAt: new Date() })
		.where(eq(notes.id, event.params.id))
		.returning();

	if (!updated) throw error(404, 'Note not found');
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	await requireUserId(event);
	await db.delete(notes).where(eq(notes.id, event.params.id));
	return new Response(null, { status: 204 });
};
