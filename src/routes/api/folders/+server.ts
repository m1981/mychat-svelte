// src/routes/api/folders/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { folderService } from '$lib/server/services/folder.service';
import type { CreateFolderDTO } from '$lib/server/repositories/folder.repository';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// TODO: Get userId from session
		const userId = 1;

		const includeTree = url.searchParams.get('tree') === 'true';

		if (includeTree) {
			const tree = await folderService.getFolderTree(userId);
			return json({ data: tree });
		}

		const folders = await folderService.getUserFolders(userId);
		return json({ data: folders, total: folders.length });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		// TODO: Get userId from session
		const userId = 1;

		const body = await request.json();
		const data: CreateFolderDTO = {
			userId,
			name: body.name,
			parentId: body.parentId,
			type: body.type,
			color: body.color
		};

		// Validate
		if (!data.name || data.name.length < 1 || data.name.length > 100) {
			return json({ message: 'Invalid folder name (1-100 characters)' }, { status: 400 });
		}

		const folder = await folderService.createFolder(data);
		return json(folder, { status: 201 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message.includes('depth') ? 400 : 500 }
		);
	}
};