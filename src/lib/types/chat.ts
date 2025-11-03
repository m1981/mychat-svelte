// ============================================
// APPLICATION LAYER TYPES
// ============================================

// Model Configuration
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

// Core Domain Types
export interface Message {
	id: string;
	chatId: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	tags?: Tag[];
	highlights?: Highlight[];
	createdAt: Date | string;
}

export interface Chat {
	id: string;
	title: string;
	messages: Message[];
	config: ChatConfig;
	folderId?: string;
	tags?: Tag[];
	metadata?: ChatMetadata;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface Folder {
	id: string;
	name: string;
	parentId?: string;
	type: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
	expanded: boolean;
	order: number;
	color?: string;
	createdAt?: Date | string;
	updatedAt?: Date | string;
}

export interface Note {
	id: string;
	chatId: string;
	messageId?: string;
	type: 'SCRATCH' | 'SUMMARY' | 'TODO';
	content: string;
	tags?: Tag[];
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface Highlight {
	id: string;
	messageId: string;
	text: string;
	startOffset: number;
	endOffset: number;
	color?: string;
	note?: string;
	createdAt: Date | string;
}

export interface Attachment {
	id: string;
	chatId: string;
	type: 'FILE' | 'URL' | 'IMAGE';
	content: string; // URL or file path
	metadata?: AttachmentMetadata;
	createdAt: Date | string;
}

export interface Tag {
	id: number;
	name: string;
	color?: string;
	type: 'CHAT' | 'MESSAGE' | 'NOTE';
	createdAt?: Date | string;
}

export interface Reference {
	id: string;
	type: 'CHAT' | 'FOLDER' | 'MESSAGE';
	targetId: string;
	title: string; // Display name
	context?: string; // Additional context
}

// Metadata Types
export interface ChatMetadata {
	tokenCount?: number;
	embedding?: number[];
	[key: string]: unknown;
}

export interface AttachmentMetadata {
	filename?: string;
	size?: number;
	mimeType?: string;
	[key: string]: unknown;
}

// Search Types
export interface SearchQuery {
	text?: string;
	tags?: string[];
	semantic?: boolean;
	folderId?: string;
	dateFrom?: Date;
	dateTo?: Date;
}

export interface SearchResult {
	chatId: string;
	messageId?: string;
	title: string;
	snippet: string;
	score: number;
	highlights: string[];
	matchType: 'text' | 'semantic' | 'tag';
}

// Utility Types
export type FolderCollection = Record<string, Folder>;

export type FolderType = 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
export type AttachmentType = 'FILE' | 'URL' | 'IMAGE';
export type NoteType = 'SCRATCH' | 'SUMMARY' | 'TODO';
export type TagType = 'CHAT' | 'MESSAGE' | 'NOTE';
export type ReferenceType = 'CHAT' | 'FOLDER' | 'MESSAGE';

// Request/Response Types for API
export interface CreateNoteRequest {
	chatId: string;
	messageId?: string;
	type: NoteType;
	content: string;
	tags?: number[];
}

export interface UpdateNoteRequest {
	id: string;
	content?: string;
	type?: NoteType;
	tags?: number[];
}

export interface CreateHighlightRequest {
	messageId: string;
	text: string;
	startOffset: number;
	endOffset: number;
	color?: string;
	note?: string;
}

export interface CreateAttachmentRequest {
	chatId: string;
	type: AttachmentType;
	content: string;
	metadata?: AttachmentMetadata;
}

export interface CreateTagRequest {
	name: string;
	color?: string;
	type: TagType;
}

// API Response Types
export interface ApiResponse<T> {
	success: boolean;
	data?: T;
	error?: string;
}

export interface PaginatedResponse<T> {
	items: T[];
	total: number;
	page: number;
	pageSize: number;
	hasMore: boolean;
}
