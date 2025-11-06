// src/lib/stores/attachment.store.enhanced.ts
/**
 * Enhanced Attachment Store with Local-First Architecture
 */

import { writable, get } from 'svelte/store';
import type { Attachment, CreateAttachmentDTO } from '$lib/types/attachment';
import { localDB } from '$lib/services/local-db';
import { syncService } from '$lib/services/sync.service';
import { toast } from './toast.store';
import { browser } from '$app/environment';

// Core store
export const attachments = writable<Attachment[]>([]);

/**
 * Load attachments for a chat (local-first)
 */
export async function loadAttachmentsByChatId(chatId: string): Promise<void> {
	if (!browser) return;

	try {
		// IndexedDB doesn't have this method yet - need to add it
		// For now, get all and filter (not ideal but works)
		const allAttachments = await localDB.getAll<Attachment>('attachments');
		const chatAttachments = allAttachments.filter(a => a.chatId === chatId);
		attachments.set(chatAttachments);
	} catch (error) {
		console.error('Failed to load attachments from local DB:', error);
		attachments.set([]);
	}
}

/**
 * Create a new attachment (local-first)
 */
export async function createAttachment(data: CreateAttachmentDTO): Promise<Attachment | null> {
	if (!browser) return null;

	const attachmentId = `attachment-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	const now = new Date();

	const newAttachment: Attachment = {
		id: attachmentId,
		chatId: data.chatId,
		type: data.type,
		content: data.content,
		metadata: data.metadata || {},
		createdAt: now
	};

	try {
		// 1. Save to IndexedDB immediately
		await localDB.put('attachments', newAttachment);

		// 2. Update store
		attachments.update(current => [...current, newAttachment]);

		// 3. Queue for server sync
		await syncService.queueOperation('CREATE', 'ATTACHMENT', attachmentId, newAttachment);

		toast.success('Attachment added');
		console.log(`✅ Attachment created locally: ${attachmentId}`);

		return newAttachment;
	} catch (error) {
		console.error('Failed to create attachment:', error);
		toast.error('Failed to add attachment');
		return null;
	}
}

/**
 * Delete an attachment (local-first)
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
	if (!browser) return;

	try {
		// 1. Delete from IndexedDB
		await localDB.delete('attachments', attachmentId);

		// 2. Update store
		attachments.update(current => current.filter(a => a.id !== attachmentId));

		// 3. Queue for server sync
		await syncService.queueOperation('DELETE', 'ATTACHMENT', attachmentId, null);

		toast.success('Attachment deleted');
		console.log(`✅ Attachment deleted locally: ${attachmentId}`);
	} catch (error) {
		console.error('Failed to delete attachment:', error);
		toast.error('Failed to delete attachment');
	}
}

/**
 * Clear all attachments
 */
export function clearAttachments(): void {
	attachments.set([]);
}