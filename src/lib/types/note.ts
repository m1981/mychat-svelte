import type { Tag } from './chat';

export interface Note {
	id: string;
	chatId: string;
	messageId?: string;
	type: 'SCRATCH' | 'SUMMARY' | 'TODO';
	content: string;
	tags: Tag[];
	createdAt: Date;
	updatedAt: Date;
}

export interface CreateNoteDTO {
	chatId: string;
	messageId?: string;
	type: 'SCRATCH' | 'SUMMARY' | 'TODO';
	content: string;
	tags?: string[];
}

export interface UpdateNoteDTO {
	content?: string;
	type?: 'SCRATCH' | 'SUMMARY' | 'TODO';
	tags?: string[];
}
