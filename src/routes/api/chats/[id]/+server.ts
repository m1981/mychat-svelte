import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { requireUserId } from '$lib/server/auth-utils';
import type { RequestHandler } from './$types';

const SUPPORTED_MODELS = new Set([
	'claude-haiku-4-5-20251001',
	'claude-sonnet-4-6',
	'claude-opus-4-6'
]);

export const GET: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	const [chat] = await db.select().from(chats).where(and(eq(chats.id, event.params.id), eq(chats.userId, userId)));
	if (!chat) throw error(404, 'Chat not found');
	return json(chat);
};

export const PATCH: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	const body = await event.request.json();

	if (body.modelId !== undefined && !SUPPORTED_MODELS.has(body.modelId)) {
		throw error(400, `Unsupported model. Allowed: ${[...SUPPORTED_MODELS].join(', ')}`);
	}

	const [updated] = await db
		.update(chats)
		.set({ ...body, updatedAt: new Date() })
		.where(and(eq(chats.id, event.params.id), eq(chats.userId, userId)))
		.returning();

	if (!updated) throw error(404, 'Chat not found');
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	const userId = await requireUserId(event);
	await db.delete(chats).where(and(eq(chats.id, event.params.id), eq(chats.userId, userId)));
	return json({ success: true });
};
