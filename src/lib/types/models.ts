// File: src/lib/types/models.ts
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type {
	users, folders, chats, messages,
	notes, highlights
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

// ============================================
// INSERT DTOs (For creating new records)
// ============================================
export type CreateFolderDTO = InferInsertModel<typeof folders>;
export type CreateChatDTO = InferInsertModel<typeof chats>;
export type CreateMessageDTO = InferInsertModel<typeof messages>;
export type CreateNoteDTO = InferInsertModel<typeof notes>;
export type CreateHighlightDTO = InferInsertModel<typeof highlights>;

// ============================================
// AGGREGATE / DOMAIN MODELS (For the UI)
// ============================================

// Rich Chat Model (Includes relations for the UI)
export interface ChatWithRelations extends Chat {
	messages: Message[];
	folder?: Folder | null;
	notes?: Note[];
}