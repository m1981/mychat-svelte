import { writable, derived } from 'svelte/store';
import type { Attachment, CreateAttachmentRequest, ApiResponse } from '$lib/types/chat';

export const attachments = writable<Attachment[]>([]);

export async function fetchAttachments(chatId: string): Promise<void> {
	try {
		const response = await fetch(`/api/attachments?chatId=${chatId}`);
		const result: ApiResponse<Attachment[]> = await response.json();

		if (result.success && result.data) {
			attachments.set(result.data);
		}
	} catch (error) {
		console.error('Error fetching attachments:', error);
	}
}

export async function createAttachment(data: CreateAttachmentRequest): Promise<Attachment | null> {
	try {
		const response = await fetch('/api/attachments', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data)
		});

		const result: ApiResponse<Attachment> = await response.json();

		if (result.success && result.data) {
			attachments.update((current) => [...current, result.data!]);
			return result.data;
		}
		return null;
	} catch (error) {
		console.error('Error creating attachment:', error);
		return null;
	}
}

export async function deleteAttachment(id: string): Promise<boolean> {
	try {
		const response = await fetch(`/api/attachments?id=${id}`, { method: 'DELETE' });
		const result: ApiResponse<void> = await response.json();

		if (result.success) {
			attachments.update((current) => current.filter((a) => a.id !== id));
			return true;
		}
		return false;
	} catch (error) {
		console.error('Error deleting attachment:', error);
		return false;
	}
}

export function attachmentsByChatId(chatId: string) {
	return derived(attachments, ($attachments) =>
		$attachments.filter((a) => a.chatId === chatId)
	);
}
