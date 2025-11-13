// src/routes/api/sync/attachments/+server.ts
/**
 * Sync endpoint for attachments
 * Returns attachments that have been modified since lastSyncTime
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attachments, chats } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = 1; // TODO: Get from session

		const body = await request.json();
		const lastSyncTime = body.lastSyncTime ? new Date(body.lastSyncTime) : null;

		// Get all attachments for user's chats
		const results = await db
			.select({
				id: attachments.id,
				chatId: attachments.chatId,
				type: attachments.type,
				content: attachments.content,
				metadata: attachments.metadata,
				createdAt: attachments.createdAt
			})
			.from(attachments)
			.innerJoin(chats, eq(chats.id, attachments.chatId))
			.where(eq(chats.userId, userId));

		// Filter by lastSyncTime if provided
		const syncedAttachments = lastSyncTime
			? results.filter((a) => a.createdAt > lastSyncTime)
			: results;

		return json({
			attachments: syncedAttachments,
			total: syncedAttachments.length,
			syncTime: new Date().toISOString()
		});
	} catch (error) {
		console.error('Sync Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Sync failed' },
			{ status: 500 }
		);
	}
};