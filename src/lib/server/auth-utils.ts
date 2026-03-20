import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getDefaultUserId } from '$lib/server/db/user';
import { env } from '$env/dynamic/private';

/**
 * Returns the authenticated user's ID from the session.
 * Throws 401 if not authenticated.
 *
 * Dev/test bypass: if TEST_AUTH_TOKEN is set in the environment and the
 * incoming request carries a matching `x-test-auth-token` header, we fall
 * back to the default local user instead of requiring a real session.
 * This env var is never set in production, so the bypass is inert there.
 */
export async function requireUserId(event: RequestEvent): Promise<string> {
	const testToken = env.TEST_AUTH_TOKEN;
	if (testToken && event.request.headers.get('x-test-auth-token') === testToken) {
		return getDefaultUserId();
	}
	const session = await event.locals.auth();
	if (!session?.user?.id) throw error(401, 'Unauthorized');
	return session.user.id;
}
