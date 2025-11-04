import { writable } from 'svelte/store';
import type { Attachment, CreateAttachmentDTO } from '$lib/types/attachment';
import { withErrorHandling } from '$lib/utils/error-handler';
import { toast } from './toast.store';

function createAttachmentStore() {
	const { subscribe, set, update } = writable<Attachment[]>([]);

	return {
		subscribe,

		/**
		 * Load attachments for a chat
		 */
		async loadByChatId(chatId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/attachments?chatId=${chatId}`);
					if (!response.ok) throw new Error('Failed to load attachments');

					const data = await response.json();
					set(data.data);
				},
				{
					errorMessage: 'Failed to load attachments',
					showToast: false // Silent load
				}
			);
		},

		/**
		 * Create a new attachment
		 */
		async create(data: CreateAttachmentDTO): Promise<Attachment | null> {
			return withErrorHandling(
				async () => {
					const response = await fetch('/api/attachments', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify(data)
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.message || 'Failed to create attachment');
					}

					const attachment = await response.json();

					update((attachments) => [...attachments, attachment]);
					toast.success('Attachment added');

					return attachment;
				},
				{
					errorMessage: 'Failed to create attachment',
					showToast: true
				}
			);
		},

		/**
		 * Delete an attachment
		 */
		async delete(attachmentId: string): Promise<void> {
			await withErrorHandling(
				async () => {
					const response = await fetch(`/api/attachments/${attachmentId}`, {
						method: 'DELETE'
					});

					if (!response.ok) throw new Error('Failed to delete attachment');

					update((attachments) => attachments.filter((a) => a.id !== attachmentId));
					toast.success('Attachment deleted');
				},
				{
					errorMessage: 'Failed to delete attachment',
					showToast: true
				}
			);
		},

		/**
		 * Clear all attachments
		 */
		clear(): void {
			set([]);
		}
	};
}

export const attachments = createAttachmentStore();
