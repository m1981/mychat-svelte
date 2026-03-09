import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { folders } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const body = await request.json();

	const [updated] = await db
		.update(folders)
		.set(body)
		.where(eq(folders.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Folder not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	// FK constraint (onDelete: 'set null') handles nullifying chats.folderId
	await db.delete(folders).where(eq(folders.id, params.id));
	return json({ success: true });
};
