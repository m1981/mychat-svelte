import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const { content } = await request.json();

	const [updated] = await db
		.update(notes)
		.set({ content, updatedAt: new Date() })
		.where(eq(notes.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Note not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.delete(notes).where(eq(notes.id, params.id));
	return new Response(null, { status: 204 });
};
