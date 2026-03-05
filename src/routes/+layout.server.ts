// File: src/routes/+layout.server.ts
import { db } from '$lib/server/db';
import { chats as chatsTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import type { Chat, FolderCollection } from '$lib/types/models';
import { desc } from 'drizzle-orm';

export const load: LayoutServerLoad = async () => {
	// Fetch ONLY chat metadata (no messages) for the sidebar
	const allDbChats = await db.query.chats.findMany({
		orderBy: [desc(chatsTable.createdAt)],
		// REMOVED: with: { messages: ... }
	});

	const sampleFolders: FolderCollection = {
		'folder-1': { id: 'folder-1', name: 'Work', expanded: true, order: 0, color: '#3b82f6' },
		'folder-2': { id: 'folder-2', name: 'Personal', expanded: true, order: 1, color: '#10b981' }
	};

	// Map to our strict types
	const loadedChats: Chat[] = allDbChats.map((c) => ({
		...c,
		config: c.config as Chat['config'],
		folderId: c.folderId ?? undefined,
		metadata: (c.metadata ?? undefined) as Chat['metadata']
	}));

	return {
		chats: loadedChats,
		folders: sampleFolders
	};
};