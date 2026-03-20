import { db } from '$lib/server/db';
import { highlights } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async (event) => {
	await requireUserId(event);
	await db.delete(highlights).where(eq(highlights.id, event.params.id));
	return new Response(null, { status: 204 });
};
