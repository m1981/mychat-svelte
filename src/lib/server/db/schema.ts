// src/lib/server/db/schema.ts

import { pgTable, serial, text, timestamp, varchar, jsonb, integer, pgEnum, real, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { customType } from 'drizzle-orm/pg-core';

// Custom type for pgvector extension
export const vector = customType<{ data: number[]; driverData: string }>({
	dataType() {
		return 'vector(1536)';
	},
	toDriver(value: number[]): string {
		return JSON.stringify(value);
	},
	fromDriver(value: string): number[] {
		return JSON.parse(value);
	}
});

// Enums
export const folderTypeEnum = pgEnum('folder_type', ['STANDARD', 'ARCHIVE', 'FAVORITE']);
export const attachmentTypeEnum = pgEnum('attachment_type', ['FILE', 'URL', 'IMAGE']);
export const noteTypeEnum = pgEnum('note_type', ['SCRATCH', 'SUMMARY', 'TODO']);
export const tagTypeEnum = pgEnum('tag_type', ['CHAT', 'MESSAGE', 'NOTE']);

// Users table
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: varchar('email', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Folders table
export const folders = pgTable('folders', {
	id: varchar('id', { length: 64 }).primaryKey(),
	userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 100 }).notNull(),
	parentId: varchar('parent_id', { length: 64 }).references((): any => folders.id, { onDelete: 'cascade' }),
	type: folderTypeEnum('type').default('STANDARD').notNull(),
	expanded: integer('expanded').default(1).notNull(),
	order: integer('order').default(0).notNull(),
	color: varchar('color', { length: 20 }),
	deletedAt: timestamp('deleted_at'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Chats table with embedding support
export const chats = pgTable('chats', {
	id: varchar('id', { length: 64 }).primaryKey(),
	userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	title: varchar('title', { length: 255 }).notNull(),
	folderId: varchar('folder_id', { length: 64 }).references(() => folders.id, { onDelete: 'set null' }),
	config: jsonb('config').notNull(),
	metadata: jsonb('metadata').default('{}').notNull(),
	embedding: vector('embedding'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
	userIdIdx: index('chats_user_id_idx').on(table.userId),
	folderIdIdx: index('chats_folder_id_idx').on(table.folderId)
}));

// Messages table with embedding support
export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	chatId: varchar('chat_id', { length: 64 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	role: varchar('role', { length: 16, enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	embedding: vector('embedding'),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
	chatIdIdx: index('messages_chat_id_idx').on(table.chatId)
}));

// Notes table
export const notes = pgTable('notes', {
	id: varchar('id', { length: 64 }).primaryKey(),
	chatId: varchar('chat_id', { length: 64 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	messageId: integer('message_id').references(() => messages.id, { onDelete: 'cascade' }),
	type: noteTypeEnum('type').default('SCRATCH').notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
	chatIdIdx: index('notes_chat_id_idx').on(table.chatId),
	messageIdIdx: index('notes_message_id_idx').on(table.messageId)
}));

// Highlights table
export const highlights = pgTable('highlights', {
	id: varchar('id', { length: 64 }).primaryKey(),
	messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
	text: text('text').notNull(),
	startOffset: integer('start_offset').notNull(),
	endOffset: integer('end_offset').notNull(),
	color: varchar('color', { length: 20 }).default('#FFFF00').notNull(),
	note: text('note'),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
	messageIdIdx: index('highlights_message_id_idx').on(table.messageId)
}));

// Attachments table
export const attachments = pgTable('attachments', {
	id: varchar('id', { length: 64 }).primaryKey(),
	chatId: varchar('chat_id', { length: 64 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	type: attachmentTypeEnum('type').notNull(),
	content: text('content').notNull(),
	metadata: jsonb('metadata').default('{}').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
	chatIdIdx: index('attachments_chat_id_idx').on(table.chatId)
}));

// Tags table
export const tags = pgTable('tags', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
	name: varchar('name', { length: 100 }).notNull(),
	color: varchar('color', { length: 20 }),
	type: tagTypeEnum('type').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Junction tables
export const chatTags = pgTable('chat_tags', {
	chatId: varchar('chat_id', { length: 64 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const messageTags = pgTable('message_tags', {
	messageId: integer('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

export const noteTags = pgTable('note_tags', {
	noteId: varchar('note_id', { length: 64 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
	tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').defaultNow().notNull()
});


// =================================================================
// RELATIONSHIPS
// =================================================================

export const usersRelations = relations(users, ({ many }) => ({
	chats: many(chats),
	folders: many(folders),
	tags: many(tags)
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
	user: one(users, {
		fields: [folders.userId],
		references: [users.id]
	}),
	parent: one(folders, {
		fields: [folders.parentId],
		references: [folders.id],
		relationName: 'folder_hierarchy'
	}),
	children: many(folders, {
		relationName: 'folder_hierarchy'
	}),
	chats: many(chats)
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
	user: one(users, {
		fields: [chats.userId],
		references: [users.id]
	}),
	folder: one(folders, {
		fields: [chats.folderId],
		references: [folders.id]
	}),
	messages: many(messages),
	notes: many(notes),
	attachments: many(attachments),
	chatTags: many(chatTags)
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id]
	}),
	notes: many(notes),
	highlights: many(highlights),
	messageTags: many(messageTags)
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
	chat: one(chats, {
		fields: [notes.chatId],
		references: [chats.id]
	}),
	message: one(messages, {
		fields: [notes.messageId],
		references: [messages.id]
	}),
	noteTags: many(noteTags)
}));

export const highlightsRelations = relations(highlights, ({ one }) => ({
	message: one(messages, {
		fields: [highlights.messageId],
		references: [messages.id]
	})
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
	chat: one(chats, {
		fields: [attachments.chatId],
		references: [chats.id]
	})
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
	user: one(users, {
		fields: [tags.userId],
		references: [users.id]
	}),
	chatTags: many(chatTags),
	messageTags: many(messageTags),
	noteTags: many(noteTags)
}));

export const chatTagsRelations = relations(chatTags, ({ one }) => ({
	chat: one(chats, {
		fields: [chatTags.chatId],
		references: [chats.id]
	}),
	tag: one(tags, {
		fields: [chatTags.tagId],
		references: [tags.id]
	})
}));

export const messageTagsRelations = relations(messageTags, ({ one }) => ({
	message: one(messages, {
		fields: [messageTags.messageId],
		references: [messages.id]
	}),
	tag: one(tags, {
		fields: [messageTags.tagId],
		references: [tags.id]
	})
}));

export const noteTagsRelations = relations(noteTags, ({ one }) => ({
	note: one(notes, {
		fields: [noteTags.noteId],
		references: [notes.id]
	}),
	tag: one(tags, {
		fields: [noteTags.tagId],
		references: [tags.id]
	})
}));