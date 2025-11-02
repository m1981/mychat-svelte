import { db } from '$lib/server/db';
import { chats as chatsTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import type { Chat, FolderCollection } from '$lib/types/chat';
import { desc } from 'drizzle-orm';

export const load: LayoutServerLoad = async () => {
	// In a real app, you'd filter by a logged-in user's ID here.
	const allDbChats = await db.query.chats.findMany({
		orderBy: [desc(chatsTable.createdAt)],
		with: {
			messages: {
				orderBy: (messages, { asc }) => [asc(messages.createdAt)]
			}
		}
	});

	// For now, we'll just use the sample folders. You could store these in the DB too.
	const sampleFolders: FolderCollection = {
		'folder-1': { id: 'folder-1', name: 'Work', expanded: true, order: 0, color: '#3b82f6' },
		'folder-2': { id: 'folder-2', name: 'Personal', expanded: true, order: 1, color: '#10b981' }
	};

	// Drizzle returns `config` as a JSON object, but we need to ensure it matches our TS type.
	const loadedChats: Chat[] = allDbChats.map((c) => ({
		...c,
		config: c.config as Chat['config'] // Type assertion
	}));

	return {
		chats: loadedChats,
		folders: sampleFolders
	};
};