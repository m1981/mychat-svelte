// src/routes/api/sync/chats/+server.ts
/**
 * Sync endpoint for chats
 * Returns chats that have been modified since lastSyncTime
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { chatRepository } from '$lib/server/repositories/chat.repository';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = 1; // TODO: Get from session

		const body = await request.json();
		const lastSyncTime = body.lastSyncTime ? new Date(body.lastSyncTime) : null;

		// Get all chats (or filter by lastSyncTime if you add updatedAt filtering)
		const { chats } = await chatRepository.findByUserId(userId, {
			limit: 1000, // Get all chats
			sortBy: 'updatedAt',
			sortOrder: 'desc'
		});

		// Filter by lastSyncTime if provided
		const syncedChats = lastSyncTime
			? chats.filter((chat) => chat.updatedAt > lastSyncTime)
			: chats;

		return json({
			chats: syncedChats,
			total: syncedChats.length,
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