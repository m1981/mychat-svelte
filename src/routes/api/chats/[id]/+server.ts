import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const SUPPORTED_MODELS = new Set([
	'claude-haiku-4-5-20251001',
	'claude-sonnet-4-6',
	'claude-opus-4-6'
]);

export const GET: RequestHandler = async ({ params }) => {
	const [chat] = await db.select().from(chats).where(eq(chats.id, params.id));
	if (!chat) throw error(404, 'Chat not found');
	return json(chat);
};

export const PATCH: RequestHandler = async ({ request, params }) => {
	const body = await request.json();

	if (body.modelId !== undefined && !SUPPORTED_MODELS.has(body.modelId)) {
		throw error(400, `Unsupported model. Allowed: ${[...SUPPORTED_MODELS].join(', ')}`);
	}

	const [updated] = await db
		.update(chats)
		.set({ ...body, updatedAt: new Date() })
		.where(eq(chats.id, params.id))
		.returning();

	if (!updated) throw error(404, 'Chat not found');
	return json(updated);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await db.delete(chats).where(eq(chats.id, params.id));
	return json({ success: true });
};
