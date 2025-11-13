import { json, type RequestHandler } from '@sveltejs/kit';
import { attachmentService } from '$lib/server/services/attachment.service';
import type { CreateAttachmentDTO } from '$lib/types/attachment';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');

		if (!chatId) {
			return json({ message: 'chatId required' }, { status: 400 });
		}

		const attachments = await attachmentService.getChatAttachments(chatId);
		return json({ data: attachments, total: attachments.length });
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
		const data: CreateAttachmentDTO = await request.json();

		// Validate
		if (!data.chatId || !data.type || !data.content) {
			return json({ message: 'Missing required fields' }, { status: 400 });
		}

		const attachment = await attachmentService.createAttachment(data);
		return json(attachment, { status: 201 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
