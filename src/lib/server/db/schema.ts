// Database schema for chat management system
import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  jsonb,
  integer,
  boolean,
  index,
  pgEnum,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================
export const folderTypeEnum = pgEnum('folder_type', ['STANDARD', 'ARCHIVE', 'FAVORITE']);
export const attachmentTypeEnum = pgEnum('attachment_type', ['FILE', 'URL', 'IMAGE']);
export const noteTypeEnum = pgEnum('note_type', ['SCRATCH', 'SUMMARY', 'TODO']);
export const tagTypeEnum = pgEnum('tag_type', ['CHAT', 'MESSAGE', 'NOTE']);
export const roleEnum = pgEnum('role', ['user', 'assistant', 'system']);

// ============================================
// CORE TABLES
// ============================================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const folders = pgTable('folders', {
  id: varchar('id', { length: 32 }).primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: varchar('parent_id', { length: 32 }),
  type: folderTypeEnum('type').default('STANDARD').notNull(),
  expanded: boolean('expanded').default(true),
  order: integer('order').default(0),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('folders_user_id_idx').on(table.userId),
  parentIdIdx: index('folders_parent_id_idx').on(table.parentId)
}));

export const chats = pgTable('chats', {
  id: varchar('id', { length: 32 }).primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  folderId: varchar('folder_id', { length: 32 }),
  title: varchar('title', { length: 200 }).notNull(),
  config: jsonb('config').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('chats_user_id_idx').on(table.userId),
  folderIdIdx: index('chats_folder_id_idx').on(table.folderId)
}));

export const messages = pgTable('messages', {
  id: varchar('id', { length: 32 }).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: roleEnum('role').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('messages_chat_id_idx').on(table.chatId)
}));

// ============================================
// FEATURE TABLES
// ============================================

export const notes = pgTable('notes', {
  id: varchar('id', { length: 32 }).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 32 }).references(() => messages.id, { onDelete: 'cascade' }),
  type: noteTypeEnum('type').default('SCRATCH').notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('notes_chat_id_idx').on(table.chatId),
  messageIdIdx: index('notes_message_id_idx').on(table.messageId)
}));

export const highlights = pgTable('highlights', {
  id: varchar('id', { length: 32 }).primaryKey(),
  messageId: varchar('message_id', { length: 32 }).notNull().references(() => messages.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  startOffset: integer('start_offset').notNull(),
  endOffset: integer('end_offset').notNull(),
  color: varchar('color', { length: 7 }).default('#FFFF00'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  messageIdIdx: index('highlights_message_id_idx').on(table.messageId)
}));

export const attachments = pgTable('attachments', {
  id: varchar('id', { length: 32 }).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  type: attachmentTypeEnum('type').notNull(),
  content: text('content').notNull(), // URL or file path
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('attachments_chat_id_idx').on(table.chatId)
}));

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }),
  type: tagTypeEnum('type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdIdx: index('tags_user_id_idx').on(table.userId),
  nameIdx: index('tags_name_idx').on(table.name)
}));

// ============================================
// JUNCTION TABLES (Many-to-Many)
// ============================================

export const chatTags = pgTable('chat_tags', {
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.chatId, table.tagId] }),
  chatIdIdx: index('chat_tags_chat_id_idx').on(table.chatId),
  tagIdIdx: index('chat_tags_tag_id_idx').on(table.tagId)
}));

export const messageTags = pgTable('message_tags', {
  messageId: varchar('message_id', { length: 32 }).notNull().references(() => messages.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.messageId, table.tagId] }),
  messageIdIdx: index('message_tags_message_id_idx').on(table.messageId),
  tagIdIdx: index('message_tags_tag_id_idx').on(table.tagId)
}));

export const noteTags = pgTable('note_tags', {
  noteId: varchar('note_id', { length: 32 }).notNull().references(() => notes.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  pk: primaryKey({ columns: [table.noteId, table.tagId] }),
  noteIdIdx: index('note_tags_note_id_idx').on(table.noteId),
  tagIdIdx: index('note_tags_tag_id_idx').on(table.tagId)
}));

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  folders: many(folders),
  chats: many(chats),
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
    relationName: 'folderHierarchy'
  }),
  children: many(folders, {
    relationName: 'folderHierarchy'
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
  highlights: many(highlights),
  notes: many(notes),
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

// ============================================
// TYPES (inferred from schema)
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export type Highlight = typeof highlights.$inferSelect;
export type NewHighlight = typeof highlights.$inferInsert;

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;

export type Tag = typeof tags.$inferSelect;
export type NewTag = typeof tags.$inferInsert;

export type ChatTag = typeof chatTags.$inferSelect;
export type MessageTag = typeof messageTags.$inferSelect;
export type NoteTag = typeof noteTags.$inferSelect;
