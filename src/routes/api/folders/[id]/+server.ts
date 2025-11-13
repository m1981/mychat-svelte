// src/routes/api/folders/[id]/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { folderService } from '$lib/server/services/folder.service';
import type { UpdateFolderDTO } from '$lib/server/repositories/folder.repository';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id: folderId } = params;
		if (!folderId) {
			return json({ message: 'Folder ID is required' }, { status: 400 });
		}

		// TODO: Get userId from session
		const userId = 1;

		const folder = await folderService.getFolder(folderId, userId);
		return json(folder);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message === 'Folder not found' ? 404 : 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { id: folderId } = params;
		if (!folderId) {
			return json({ message: 'Folder ID is required' }, { status: 400 });
		}

		// TODO: Get userId from session
		const userId = 1;

		const data: UpdateFolderDTO = await request.json();

		// Validate name if provided
		if (data.name !== undefined && (data.name.length < 1 || data.name.length > 100)) {
			return json({ message: 'Invalid folder name (1-100 characters)' }, { status: 400 });
		}

		const folder = await folderService.updateFolder(folderId, userId, data);
		return json(folder);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message.includes('circular') ? 400 : 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params, url }) => {
	try {
		const { id: folderId } = params;
		if (!folderId) {
			return json({ message: 'Folder ID is required' }, { status: 400 });
		}

		const userId = 1; // TODO: Get userId from session

		// MODIFIED: Read new query params for soft delete logic
		const permanent = url.searchParams.get('permanent') === 'true';
		const cascade = url.searchParams.get('cascade') === 'true';

		await folderService.deleteFolder(folderId, userId, permanent, cascade);
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message.includes('not empty') ? 400 : 500 }
		);
	}
};