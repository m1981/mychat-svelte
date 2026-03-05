// File: src/lib/types/models.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
	users, folders, chats, messages,
	notes, highlights, attachments, tags
} from '$lib/server/db/schema';

// ============================================
// BASE ENTITIES (Inferred from Database)
// ============================================
export type User = InferSelectModel<typeof users>;
export type Folder = InferSelectModel<typeof folders>;
export type Chat = InferSelectModel<typeof chats>;
export type Message = InferSelectModel<typeof messages>;
export type Note = InferSelectModel<typeof notes>;
export type Highlight = InferSelectModel<typeof highlights>;
export type Attachment = InferSelectModel<typeof attachments>;
export type Tag = InferSelectModel<typeof tags>;

// ============================================
// INSERT DTOs (For creating new records)
// ============================================
export type CreateFolderDTO = InferInsertModel<typeof folders>;
export type CreateChatDTO = InferInsertModel<typeof chats>;
export type CreateMessageDTO = InferInsertModel<typeof messages>;
export type CreateNoteDTO = InferInsertModel<typeof notes>;
export type CreateHighlightDTO = InferInsertModel<typeof highlights>;
export type CreateTagDTO = InferInsertModel<typeof tags>;

// ============================================
// AGGREGATE / DOMAIN MODELS (For the UI)
// ============================================

// AI Configuration Types (Stored in Chat.config JSONB)
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

export interface ChatMetadata {
	tokenCount?: number;
	lastMessageAt?: string; // Dates from JSONB usually come back as ISO strings
	messageCount?: number;
}

// Rich Chat Model (Includes relations for the UI)
export interface ChatWithRelations extends Omit<Chat, 'config' | 'metadata'> {
	config: ChatConfig;
	metadata?: ChatMetadata;
	messages: Message[];
	folder?: Folder;
	tags?: Tag[];
}

// UI Specific Types
export type FolderCollection = Record<string, Folder>;