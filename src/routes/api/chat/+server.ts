import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chats, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/**
 * GET /api/chat
 * Retrieve all chats with their messages
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const userId = url.searchParams.get('userId');

		// For now, we'll fetch all chats if no userId is provided
		// In production, you'd want proper authentication
		const allChats = userId
			? await db.query.chats.findMany({
				where: eq(chats.userId, parseInt(userId)),
				with: {
					messages: {
						orderBy: (messages, { asc }) => [asc(messages.createdAt)]
					}
				},
				orderBy: (chats, { desc }) => [desc(chats.updatedAt)]
			})
			: await db.query.chats.findMany({
				with: {
					messages: {
						orderBy: (messages, { asc }) => [asc(messages.createdAt)]
					}
				},
				orderBy: (chats, { desc }) => [desc(chats.updatedAt)]
			});

		// Transform to match frontend Chat type
		const transformedChats = allChats.map((chat) => ({
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
		}));

		return json(transformedChats);
	} catch (error) {
		console.error('Error fetching chats:', error);
		return json({ error: 'Failed to fetch chats' }, { status: 500 });
	}
};

/**
 * POST /api/chat
 * Create a new chat
 */
export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { title, provider, modelConfig, folderId, userId } = body;

		// Validate required fields
		if (!title || !provider || !modelConfig) {
			return json(
				{ error: 'Missing required fields: title, provider, modelConfig' },
				{ status: 400 }
			);
		}

		// Create new chat
		const [newChat] = await db
			.insert(chats)
			.values({
				title,
				provider,
				modelConfig,
				folderId: folderId ? parseInt(folderId) : null,
				userId: userId ? parseInt(userId) : null
			})
			.returning();

		// Transform to match frontend Chat type
		const transformedChat = {
			id: newChat.id.toString(),
			title: newChat.title,
			folder: newChat.folderId ? newChat.folderId.toString() : undefined,
			messages: [],
			config: {
				provider: newChat.provider as 'openai' | 'anthropic',
				modelConfig: newChat.modelConfig
			}
		};

		return json(transformedChat, { status: 201 });
	} catch (error) {
		console.error('Error creating chat:', error);
		return json({ error: 'Failed to create chat' }, { status: 500 });
	}
};
