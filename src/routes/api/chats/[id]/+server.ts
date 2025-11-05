// src/routes/api/chats/[id]/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { chatService } from '$lib/server/services/chat.service';
import type { UpdateChatDTO } from '$lib/server/repositories/chat.repository';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id: chatId } = params;
		if (!chatId) {
			return json({ message: 'Chat ID is required' }, { status: 400 });
		}

		// TODO: Get userId from session
		const userId = 1;

		const chat = await chatService.getChat(chatId, userId);
		return json(chat);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message === 'Chat not found' ? 404 : 500 }
		);
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const { id: chatId } = params;
		if (!chatId) {
			return json({ message: 'Chat ID is required' }, { status: 400 });
		}

		// TODO: Get userId from session
		const userId = 1;

		const data: UpdateChatDTO = await request.json();

		// Validate title if provided
		if (data.title !== undefined && (data.title.length < 1 || data.title.length > 100)) {
			return json({ message: 'Invalid chat title (1-100 characters)' }, { status: 400 });
		}

		const chat = await chatService.updateChat(chatId, userId, data);
		return json(chat);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id: chatId } = params;
		if (!chatId) {
			return json({ message: 'Chat ID is required' }, { status: 400 });
		}

		// TODO: Get userId from session
		const userId = 1;

		await chatService.deleteChat(chatId, userId);
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};