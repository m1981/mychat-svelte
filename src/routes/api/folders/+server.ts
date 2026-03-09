import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { folders } from '$lib/server/db/schema';
import { getDefaultUserId } from '$lib/server/db/user';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { id, name, order } = await request.json();
	const userId = await getDefaultUserId();

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
