import { db } from './index';
import { users } from './schema';
import { createId } from '@paralleldrive/cuid2';

const DEFAULT_USER_EMAIL = 'default@local.app';

/**
 * Pre-auth: ensures a single default user always exists.
 * Replace with real session logic when auth is added.
 */
export async function getDefaultUserId(): Promise<string> {
	const existing = await db.query.users.findFirst({
		where: (u, { eq }) => eq(u.email, DEFAULT_USER_EMAIL)
	});

	if (existing) return existing.id;

	const id = createId();
	await db.insert(users).values({ id, email: DEFAULT_USER_EMAIL });
	return id;
}
