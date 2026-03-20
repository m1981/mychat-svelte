import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { folders } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	const body = await event.request.json();

	const [updated] = await db
		.update(folders)
		.set(body)
		.where(and(eq(folders.id, event.params.id), eq(folders.userId, userId)))
		.returning();

	if (!updated) throw error(404, 'Folder not found');
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	// FK constraint (onDelete: 'set null') handles nullifying chats.folderId
	await db.delete(folders).where(and(eq(folders.id, event.params.id), eq(folders.userId, userId)));
	return json({ success: true });
};
