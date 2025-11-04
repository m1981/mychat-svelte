import { json, type RequestHandler } from '@sveltejs/kit';
import { attachmentService } from '$lib/server/services/attachment.service';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const attachmentId = params.id;
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
		const attachmentId = params.id;
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
