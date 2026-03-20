// File: src/routes/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats as chatsTable, folders as foldersTable } from '$lib/server/db/schema';
import type { LayoutServerLoad } from './$types';
import type { Chat, Folder } from '$lib/types/models';
import { desc, asc, eq } from 'drizzle-orm';

export const load: LayoutServerLoad = async (event) => {
	const session = await event.locals.auth();

	// Unauthenticated users can only access /auth/* routes
	if (!session?.user && !event.url.pathname.startsWith('/auth')) {
		redirect(303, '/auth/signin');
	}

	if (!session?.user) {
		return { chats: [], folders: [], session };
	}

	const userId = session.user.id!;

	// Fetch Folders
	const dbFolders = await db.query.folders.findMany({
		where: eq(foldersTable.userId, userId),
		orderBy: [asc(foldersTable.order)]
	});

	// Fetch ONLY chat metadata (no messages) for the sidebar
	const dbChats = await db.query.chats.findMany({
		where: eq(chatsTable.userId, userId),
		orderBy: [desc(chatsTable.createdAt)]
	});

	// Map to strict types
	const loadedChats: Chat[] = dbChats.map((c) => ({
		id: c.id,
		userId: c.userId,
		title: c.title,
		folderId: c.folderId,
		modelId: c.modelId,
		tags: c.tags,
		createdAt: c.createdAt,
		updatedAt: c.updatedAt
	}));

	return {
		chats: loadedChats,
		folders: dbFolders as Folder[],
		session
	};
};
