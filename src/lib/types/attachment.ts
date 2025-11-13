export interface Attachment {
	id: string;
	chatId: string;
	type: 'FILE' | 'URL' | 'IMAGE';
	content: string;
	metadata: AttachmentMetadata;
	createdAt: Date;
}

export interface AttachmentMetadata {
	filename?: string;
	size?: number;
	mimeType?: string;
	title?: string;
	description?: string;
	thumbnailUrl?: string;
}

export interface CreateAttachmentDTO {
	chatId: string;
	type: 'FILE' | 'URL' | 'IMAGE';
	content: string;
	metadata?: Partial<AttachmentMetadata>;
}
