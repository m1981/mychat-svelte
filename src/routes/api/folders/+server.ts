import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { folders } from '$lib/server/db/schema';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	const { id, name, order } = await event.request.json();
	const userId = await requireUserId(event);

	const [folder] = await db
		.insert(folders)
		.values({
			id,
			userId,
			name: name ?? 'New Folder',
			order: order ?? 0,
			color: null
		})
		.returning();

	return json(folder);
};
