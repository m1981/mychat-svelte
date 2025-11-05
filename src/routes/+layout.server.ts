import { db } from '$lib/server/db';
import { chats as chatsTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import type { Chat, Folder, FolderCollection } from '$lib/types/chat'; // Import Folder
import { desc } from 'drizzle-orm';

export const load: LayoutServerLoad = async () => {
	// In a real app, you'd filter by a logged-in user's ID here.
	const allDbChats = await db.query.chats.findMany({
		orderBy: [desc(chatsTable.createdAt)],
		with: {
			messages: {
				orderBy: (messages, { asc }) => [asc(messages.createdAt)]
			}
			// TODO: To get tags, you would need to add `chatTags: { with: { tag: true } }` here
			// and map them below. For now, we'll add an empty array.
		}
	});

	// For now, we'll just use the sample folders. You could store these in the DB too.
	const sampleFolders: FolderCollection = {
		'folder-1': {
			id: 'folder-1',
			name: 'Work',
			expanded: true,
			order: 0,
			color: '#3b82f6',
			type: 'STANDARD',
			createdAt: new Date(),
			updatedAt: new Date()
		},
		'folder-2': {
			id: 'folder-2',
			name: 'Personal',
			expanded: true,
			order: 1,
			color: '#10b981',
			type: 'STANDARD',
			createdAt: new Date(),
			updatedAt: new Date()
		}
	};

	// Drizzle returns `config` as a JSON object, but we need to ensure it matches our TS type.
	const loadedChats: Chat[] = allDbChats.map((c) => ({
		...c,
		config: c.config as Chat['config'], // Type assertion
		// FIX: Add the missing 'tags' property to satisfy the Chat interface
		tags: [] // Or map from `c.chatTags` if you fetch them
	}));

	return {
		chats: loadedChats,
		folders: sampleFolders
	};
};