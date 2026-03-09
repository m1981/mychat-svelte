import { db } from '$lib/server/db';
import { highlights } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	await db.delete(highlights).where(eq(highlights.id, params.id));
	return new Response(null, { status: 204 });
};
