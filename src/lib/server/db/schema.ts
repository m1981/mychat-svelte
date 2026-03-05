import { pgTable, text, timestamp, varchar, jsonb, integer, vector, index } from 'drizzle-orm/pg-core';
import { relations, type InferSelectModel } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// ==========================================
// 1. CORE ENTITIES
// ==========================================

export const users = pgTable('users', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const folders = pgTable('folders', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  userId: varchar('user_id', { length: 32 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  order: integer('order').default(0).notNull(),
  color: varchar('color', { length: 7 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const chats = pgTable('chats', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  userId: varchar('user_id', { length: 32 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  folderId: varchar('folder_id', { length: 32 }).references(() => folders.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 100 }).notNull(),
  modelId: varchar('model_id', { length: 50 }).default('gpt-4o').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const messages = pgTable('messages', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16, enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('messages_chat_id_idx').on(table.chatId),
  embeddingIdx: index('messages_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops'))
}));

// ==========================================
// 2. KNOWLEDGE EXTRACTION ENTITIES
// ==========================================

export const notes = pgTable('notes', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const highlights = pgTable('highlights', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  messageId: varchar('message_id', { length: 32 }).notNull().references(() => messages.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ==========================================
// 3. EXPORTED TYPES (The Contract for Frontend)
// ==========================================
export type User = InferSelectModel<typeof users>;
export type Folder = InferSelectModel<typeof folders>;
export type Chat = InferSelectModel<typeof chats>;
export type Message = InferSelectModel<typeof messages>;
export type Note = InferSelectModel<typeof notes>;
export type Highlight = InferSelectModel<typeof highlights>;