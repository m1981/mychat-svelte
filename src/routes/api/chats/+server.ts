// src/routes/api/chats/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { chatService } from '$lib/server/services/chat.service';
import type { CreateChatDTO } from '$lib/server/repositories/chat.repository';

export const GET: RequestHandler = async ({ url }) => {
	try {
		// TODO: Get userId from session
		const userId = 1;

		// Parse query parameters
		const page = parseInt(url.searchParams.get('page') || '0');
		const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
		const folderId = url.searchParams.get('folderId') || undefined;
		const sortBy = (url.searchParams.get('sortBy') || 'updatedAt') as 'createdAt' | 'updatedAt' | 'title';
		const sortOrder = (url.searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

		const { chats, total } = await chatService.getUserChats(userId, {
			page,
			limit,
			folderId,
			sortBy,
			sortOrder
		});

		return json({
			data: chats,
			pagination: {
				page,
				limit,
				total,
				hasMore: (page + 1) * limit < total
			}
		});
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

		// Validate
		if (!body.config || !body.config.provider || !body.config.modelConfig) {
			return json({ message: 'Invalid chat configuration' }, { status: 400 });
		}

		const data: Omit<CreateChatDTO, 'userId'> = {
			title: body.title || 'New Chat',
			folderId: body.folderId,
			config: body.config,
			tags: body.tags
		};

		const chat = await chatService.createChat(userId, data);
		return json(chat, { status: 201 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};