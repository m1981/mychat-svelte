// src/lib/stores/attachment.store.ts
import { writable } from 'svelte/store';
import type { Attachment, CreateAttachmentDTO } from '$lib/types/attachment';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { browser } from '$app/environment';
import { handleError } from '$lib/utils/error-handler';

function createAttachmentStore() {
	const { subscribe, set, update } = writable<Attachment[]>([]);

	return {
		subscribe,

		/**
		 * Load attachments for a chat from the local database.
		 */
		async loadByChatId(chatId: string): Promise<void> {
			if (!browser) return;
			try {
				// This requires a new method in localDB, let's add it.
				const localAttachments = await localDB.getAttachmentsByChatId(chatId);
				set(localAttachments);
			} catch (error) {
				handleError(error, 'Failed to load attachments from local DB');
				set([]);
			}
		},

		/**
		 * Create a new attachment with a local-first approach.
		 */
		async create(data: CreateAttachmentDTO): Promise<Attachment | null> {
			if (!browser) return null;

			const attachmentId = `attachment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
			const newAttachment: Attachment = {
				id: attachmentId,
				chatId: data.chatId,
				type: data.type,
				content: data.content,
				metadata: data.metadata || {},
				createdAt: new Date()
			};

			try {
				await localDB.saveAttachment(newAttachment);
				update((current) => [...current, newAttachment]);
				syncService.queueOperation('CREATE', 'ATTACHMENT', attachmentId, newAttachment);
				toast.success('Attachment added');
				return newAttachment;
			} catch (error) {
				handleError(error, 'Failed to add attachment');
				return null;
			}
		},

		/**
		 * Delete an attachment with a local-first approach.
		 */
		async delete(attachmentId: string): Promise<void> {
			if (!browser) return;

			try {
				await localDB.deleteAttachment(attachmentId);
				update((current) => current.filter((a) => a.id !== attachmentId));
				syncService.queueOperation('DELETE', 'ATTACHMENT', attachmentId, null);
				toast.success('Attachment deleted');
			} catch (error) {
				handleError(error, 'Failed to delete attachment');
			}
		},

		/**
		 * Clear all attachments from the store.
		 */
		clear(): void {
			set([]);
		}
	};
}

export const attachments = createAttachmentStore();