import { json, type RequestHandler } from '@sveltejs/kit';
import { attachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { CreateAttachmentRequest } from '$lib/types/chat';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const chatId = url.searchParams.get('chatId');
		if (!chatId) {
			return json({ success: false, error: 'chatId required' }, { status: 400 });
		}

		const attachments = await attachmentRepository.findByChatId(chatId);
		return json({ success: true, data: attachments });
	} catch (error) {
		console.error('Error fetching attachments:', error);
		return json({ success: false, error: 'Failed to fetch attachments' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as CreateAttachmentRequest;

		if (!body.chatId || !body.type || !body.content) {
			return json({ success: false, error: 'chatId, type, and content are required' }, { status: 400 });
		}

		const attachment = await attachmentRepository.create({
			chatId: body.chatId,
			type: body.type,
			content: body.content,
			metadata: body.metadata
		});

		return json({ success: true, data: attachment }, { status: 201 });
	} catch (error) {
		console.error('Error creating attachment:', error);
		return json({ success: false, error: 'Failed to create attachment' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ url }) => {
	try {
		const id = url.searchParams.get('id');
		if (!id) {
			return json({ success: false, error: 'id is required' }, { status: 400 });
		}

		const deleted = await attachmentRepository.delete(id);
		if (!deleted) {
			return json({ success: false, error: 'Attachment not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting attachment:', error);
		return json({ success: false, error: 'Failed to delete attachment' }, { status: 500 });
	}
};
