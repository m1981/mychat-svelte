import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * GET /api/chat/[id]
 * Retrieve a single chat with its messages
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const chatId = parseInt(params.id);

		const chat = await db.query.chats.findFirst({
			where: eq(chats.id, chatId),
			with: {
				messages: {
					orderBy: (messages, { asc }) => [asc(messages.createdAt)]
				}
			}
		});

		if (!chat) {
			return json({ error: 'Chat not found' }, { status: 404 });
		}

		// Transform to match frontend Chat type
		const transformedChat = {
			id: chat.id.toString(),
			title: chat.title,
			folder: chat.folderId ? chat.folderId.toString() : undefined,
			messages: chat.messages.map((msg) => ({
				role: msg.role as 'user' | 'assistant' | 'system',
				content: msg.content
			})),
			config: {
				provider: chat.provider as 'openai' | 'anthropic',
				modelConfig: chat.modelConfig
			}
		};

		return json(transformedChat);
	} catch (error) {
		console.error('Error fetching chat:', error);
		return json({ error: 'Failed to fetch chat' }, { status: 500 });
	}
};

/**
 * PATCH /api/chat/[id]
 * Update a chat's title or folder
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const chatId = parseInt(params.id);
		const body = await request.json();
		const { title, folderId } = body;

		const updateData: any = {
			updatedAt: new Date()
		};

		if (title !== undefined) {
			updateData.title = title;
		}

		if (folderId !== undefined) {
			updateData.folderId = folderId ? parseInt(folderId) : null;
		}

		const [updatedChat] = await db
			.update(chats)
			.set(updateData)
			.where(eq(chats.id, chatId))
			.returning();

		if (!updatedChat) {
			return json({ error: 'Chat not found' }, { status: 404 });
		}

		// Fetch the updated chat with messages
		const chat = await db.query.chats.findFirst({
			where: eq(chats.id, chatId),
			with: {
				messages: {
					orderBy: (messages, { asc }) => [asc(messages.createdAt)]
				}
			}
		});

		// Transform to match frontend Chat type
		const transformedChat = {
			id: chat!.id.toString(),
			title: chat!.title,
			folder: chat!.folderId ? chat!.folderId.toString() : undefined,
			messages: chat!.messages.map((msg) => ({
				role: msg.role as 'user' | 'assistant' | 'system',
				content: msg.content
			})),
			config: {
				provider: chat!.provider as 'openai' | 'anthropic',
				modelConfig: chat!.modelConfig
			}
		};

		return json(transformedChat);
	} catch (error) {
		console.error('Error updating chat:', error);
		return json({ error: 'Failed to update chat' }, { status: 500 });
	}
};

/**
 * DELETE /api/chat/[id]
 * Delete a chat and all its messages
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const chatId = parseInt(params.id);

		// Delete all messages first (due to foreign key constraint)
		await db.delete(messages).where(eq(messages.chatId, chatId));

		// Delete the chat
		const [deletedChat] = await db
			.delete(chats)
			.where(eq(chats.id, chatId))
			.returning();

		if (!deletedChat) {
			return json({ error: 'Chat not found' }, { status: 404 });
		}

		return json({ success: true, id: deletedChat.id.toString() });
	} catch (error) {
		console.error('Error deleting chat:', error);
		return json({ error: 'Failed to delete chat' }, { status: 500 });
	}
};
