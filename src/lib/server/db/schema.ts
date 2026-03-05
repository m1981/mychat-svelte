import {
	pgTable, pgEnum, serial, text, timestamp,
	varchar, jsonb, integer, boolean, index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { ChatConfig, ChatMetadata } from '$lib/types/models';
// ============================================
// ENUMS
// ============================================
export const folderTypeEnum = pgEnum('folder_type', ['STANDARD', 'ARCHIVE', 'FAVORITE']);
export const attachmentTypeEnum = pgEnum('attachment_type', ['FILE', 'URL', 'IMAGE']);
export const noteTypeEnum = pgEnum('note_type', ['SCRATCH', 'SUMMARY', 'TODO']);
export const tagTypeEnum = pgEnum('tag_type', ['CHAT', 'MESSAGE', 'NOTE']);

// ============================================
// CORE TABLES
// ============================================
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: varchar('email', { length: 255 }).unique(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const folders = pgTable('folders', {
	id: varchar('id', { length: 32 }).primaryKey(),
	userId: integer('user_id').references(() => users.id).notNull(),
	name: varchar('name', { length: 100 }).notNull(),
	parentId: varchar('parent_id', { length: 32 }).references((): AnyPgColumn => folders.id),
	type: folderTypeEnum('type').default('STANDARD').notNull(),
	expanded: boolean('expanded').default(true),
	order: integer('order').default(0),
	color: varchar('color', { length: 7 }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (t) => [
	index('folders_user_id_idx').on(t.userId),
	index('folders_parent_id_idx').on(t.parentId)
]);

export const chats = pgTable('chats', {
	id: varchar('id', { length: 32 }).primaryKey(),
	userId: integer('user_id').references(() => users.id).notNull(),
	folderId: varchar('folder_id', { length: 32 }).references(() => folders.id),
	title: varchar('title', { length: 100 }).notNull(),

	// STRICTLY TYPE THE JSONB COLUMNS
	config: jsonb('config').$type<ChatConfig>().notNull(),
	metadata: jsonb('metadata').$type<ChatMetadata>(),

	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (t) => [
	index('chats_user_id_idx').on(t.userId),
	index('chats_folder_id_idx').on(t.folderId)
]);

export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 16, enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('messages_chat_id_idx').on(t.chatId)
]);

// ============================================
// FEATURE TABLES
// ============================================
export const notes = pgTable('notes', {
	id: varchar('id', { length: 32 }).primaryKey(),
	chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	messageId: integer('message_id').references(() => messages.id, { onDelete: 'set null' }),
	type: noteTypeEnum('type').default('SCRATCH').notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (t) => [
	index('notes_chat_id_idx').on(t.chatId)
]);

export const highlights = pgTable('highlights', {
	id: varchar('id', { length: 32 }).primaryKey(),
	messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
	text: text('text').notNull(),
	startOffset: integer('start_offset').notNull(),
	endOffset: integer('end_offset').notNull(),
	color: varchar('color', { length: 7 }).default('#FFFF00'),
	note: text('note'),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('highlights_message_id_idx').on(t.messageId)
]);

export const attachments = pgTable('attachments', {
	id: varchar('id', { length: 32 }).primaryKey(),
	chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	type: attachmentTypeEnum('type').notNull(),
	content: text('content').notNull(),
	metadata: jsonb('metadata').$type<{
		filename?: string; size?: number; mimeType?: string;
		title?: string; description?: string;
	}>(),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('attachments_chat_id_idx').on(t.chatId)
]);

export const tags = pgTable('tags', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id).notNull(),
	name: varchar('name', { length: 50 }).notNull(),
	color: varchar('color', { length: 7 }),
	type: tagTypeEnum('type').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('tags_user_id_idx').on(t.userId),
	index('tags_name_idx').on(t.name)
]);

// ============================================
// JUNCTION TABLES (Many-to-Many)
// ============================================
export const chatTags = pgTable('chat_tags', {
	chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('chat_tags_chat_id_idx').on(t.chatId),
	index('chat_tags_tag_id_idx').on(t.tagId)
]);

export const messageTags = pgTable('message_tags', {
	messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('message_tags_message_id_idx').on(t.messageId),
	index('message_tags_tag_id_idx').on(t.tagId)
]);

export const noteTags = pgTable('note_tags', {
	noteId: varchar('note_id', { length: 32 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (t) => [
	index('note_tags_note_id_idx').on(t.noteId),
	index('note_tags_tag_id_idx').on(t.tagId)
]);

// ============================================
// RELATIONS
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
	chats: many(chats),
	folders: many(folders),
	tags: many(tags)
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
	user: one(users, { fields: [folders.userId], references: [users.id] }),
	parent: one(folders, { fields: [folders.parentId], references: [folders.id], relationName: 'folderHierarchy' }),
	children: many(folders, { relationName: 'folderHierarchy' }),
	chats: many(chats)
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
	user: one(users, { fields: [chats.userId], references: [users.id] }),
	folder: one(folders, { fields: [chats.folderId], references: [folders.id] }),
	messages: many(messages),
	notes: many(notes),
	attachments: many(attachments),
	chatTags: many(chatTags)
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
	chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
	highlights: many(highlights),
	messageTags: many(messageTags),
	notes: many(notes)
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
	chat: one(chats, { fields: [notes.chatId], references: [chats.id] }),
	message: one(messages, { fields: [notes.messageId], references: [messages.id] }),
	noteTags: many(noteTags)
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
	message: one(messages, { fields: [highlights.messageId], references: [messages.id] })
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
	chat: one(chats, { fields: [attachments.chatId], references: [chats.id] })
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, { fields: [tags.userId], references: [users.id] }),
	chatTags: many(chatTags),
	messageTags: many(messageTags),
	noteTags: many(noteTags)
}));

export const chatTagsRelations = relations(chatTags, ({ one }) => ({
	chat: one(chats, { fields: [chatTags.chatId], references: [chats.id] }),
	tag: one(tags, { fields: [chatTags.tagId], references: [tags.id] })
}));

export const messageTagsRelations = relations(messageTags, ({ one }) => ({
	message: one(messages, { fields: [messageTags.messageId], references: [messages.id] }),
	tag: one(tags, { fields: [messageTags.tagId], references: [tags.id] })
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
	note: one(notes, { fields: [noteTags.noteId], references: [notes.id] }),
	tag: one(tags, { fields: [noteTags.tagId], references: [tags.id] })
}));