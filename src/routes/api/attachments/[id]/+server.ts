import { json, type RequestHandler } from '@sveltejs/kit';
import { attachmentService } from '$lib/server/services/attachment.service';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const { id: attachmentId } = params;
		// FIX: Validate that the ID parameter exists
		if (!attachmentId) {
			return json({ message: 'Attachment ID is required' }, { status: 400 });
		}
		const attachment = await attachmentService.getAttachment(attachmentId);
		return json(attachment);
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: error instanceof Error && error.message === 'Attachment not found' ? 404 : 500 }
		);
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const { id: attachmentId } = params;
		// FIX: Validate that the ID parameter exists
		if (!attachmentId) {
			return json({ message: 'Attachment ID is required' }, { status: 400 });
		}
		await attachmentService.deleteAttachment(attachmentId);
		return new Response(null, { status: 204 });
	} catch (error) {
		console.error('API Error:', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Internal error' },
			{ status: 500 }
		);
	}
};
