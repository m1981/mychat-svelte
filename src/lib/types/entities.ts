// src/lib/types/entities.ts
/**
 * Additional entity types for notes, highlights, and attachments
 */

export interface Note {
	id: string;
	chatId: string;
	messageId?: number;
	type: 'SCRATCH' | 'SUMMARY' | 'TODO';
	content: string;
	tags?: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface Highlight {
	id: string;
	messageId: string;
	text: string;
	startOffset: number;
	endOffset: number;
	color: string;
	note?: string;
	createdAt: Date;
}

export interface Attachment {
	id: string;
	chatId: string;
	type: 'FILE' | 'URL' | 'IMAGE';
	content: string;
	metadata: {
		filename?: string;
		size?: number;
		mimeType?: string;
		url?: string;
	};
	createdAt: Date;
}