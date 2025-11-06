import { db } from '$lib/server/db';
import { chats as chatsTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import type { Chat, Folder, FolderCollection } from '$lib/types/chat';
import { desc } from 'drizzle-orm';
import { folderRepository } from '$lib/server/repositories/folder.repository';

export const load: LayoutServerLoad = async () => {
	// In a real app, you'd filter by a logged-in user's ID here.
	// For now, using userId = 1 as default
	const userId = 1;

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

	// Load folders from database
	const allDbFolders = await folderRepository.findByUserId(userId);

	// Transform Folder[] to FolderCollection (Record<string, Folder>)
	const loadedFolders: FolderCollection = allDbFolders.reduce((acc, folder) => {
		acc[folder.id] = folder;
		return acc;
	}, {} as FolderCollection);

	// Drizzle returns `config` as a JSON object, but we need to ensure it matches our TS type.
	const loadedChats: Chat[] = allDbChats.map((c) => ({
		...c,
		config: c.config as Chat['config'], // Type assertion
		// FIX: Add the missing 'tags' property to satisfy the Chat interface
		tags: [] // Or map from `c.chatTags` if you fetch them
	}));

	return {
		chats: loadedChats,
		folders: loadedFolders
	};
};