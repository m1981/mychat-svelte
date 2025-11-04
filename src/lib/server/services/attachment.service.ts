import { attachmentRepository } from '$lib/server/repositories/attachment.repository';
import type { Attachment, CreateAttachmentDTO } from '$lib/types/attachment';

export class AttachmentService {
	/**
	 * Create a new attachment
	 */
	async createAttachment(data: CreateAttachmentDTO): Promise<Attachment> {
		return attachmentRepository.create(data);
	}

	/**
	 * Get an attachment by ID
	 */
	async getAttachment(attachmentId: string): Promise<Attachment> {
		const attachment = await attachmentRepository.findById(attachmentId);
		if (!attachment) {
			throw new Error('Attachment not found');
		}
		return attachment;
	}

	/**
	 * Get all attachments for a chat
	 */
	async getChatAttachments(chatId: string): Promise<Attachment[]> {
		return attachmentRepository.findByChatId(chatId);
	}

	/**
	 * Delete an attachment
	 */
	async deleteAttachment(attachmentId: string): Promise<void> {
		return attachmentRepository.delete(attachmentId);
	}
}

// Export singleton instance
export const attachmentService = new AttachmentService();
