import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Returns the authenticated user's ID from the session.
 * Throws 401 if not authenticated.
 */
export async function requireUserId(event: RequestEvent): Promise<string> {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw error(401, 'Unauthorized');
	return session.user.id;
}
