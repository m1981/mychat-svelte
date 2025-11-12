export interface ModelConfig {
	model: string;
	max_tokens: number;
	temperature: number;
	top_p: number;
	presence_penalty: number;
	frequency_penalty: number;
}

export interface ChatConfig {
	provider: 'openai' | 'anthropic';
	modelConfig: ModelConfig;
}

export interface Tag {
	id: string;
	userId?: number;
	name: string;
	color?: string;
	type: 'CHAT' | 'MESSAGE' | 'NOTE';
	createdAt: Date;
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

export interface Message {
	id?: string;
	chatId?: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	tags?: Tag[];
	highlights?: Highlight[];
	embedding?: number[];
	createdAt?: Date;
}

export interface ChatMetadata {
	tokenCount?: number;
	embedding?: number[];
	lastMessageAt?: Date;
	messageCount?: number;
}

export interface Chat {
	id: string;
	userId?: number;
	title: string;
	folderId?: string;
	messages: Message[];
	config: ChatConfig;
	tags: Tag[];
	metadata: ChatMetadata;
	createdAt: Date;
	updatedAt: Date;
	folder?: string; // Keep for backward compatibility
}

export interface Folder {
	id: string;
	userId?: number;
	name: string;
	parentId?: string;
	type: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
	expanded: boolean;
	order: number;
	color?: string;
	deletedAt?: Date | null;
	createdAt: Date;
	updatedAt: Date;
}

export type FolderCollection = Record<string, Folder>;

export interface Reference {
	id: string;
	type: 'CHAT' | 'FOLDER' | 'NOTE' | 'MESSAGE';
	targetId: string;
	title: string;
	createdAt: Date;
}