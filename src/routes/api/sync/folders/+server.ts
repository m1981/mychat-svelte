// src/routes/api/sync/folders/+server.ts
/**
 * Sync endpoint for folders
 * Returns folders that have been modified since lastSyncTime
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { folderRepository } from '$lib/server/repositories/folder.repository';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const userId = 1; // TODO: Get from session

		const body = await request.json();
		const lastSyncTime = body.lastSyncTime ? new Date(body.lastSyncTime) : null;

		// Get all folders
		const folders = await folderRepository.findByUserId(userId);

		// Filter by lastSyncTime if provided
		const syncedFolders = lastSyncTime
			? folders.filter((folder) => folder.updatedAt > lastSyncTime)
			: folders;

		return json({
			folders: syncedFolders,
			total: syncedFolders.length,
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