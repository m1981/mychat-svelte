import { pgTable, serial, integer, text, timestamp, jsonb, boolean, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	email: varchar('email', { length: 255 }).unique(),
	name: varchar('name', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Folders table
export const folders = pgTable('folders', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	name: varchar('name', { length: 255 }).notNull(),
	color: varchar('color', { length: 7 }),
	order: integer('order').notNull().default(0),
	expanded: boolean('expanded').default(true),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Chats table
export const chats = pgTable('chats', {
	id: serial('id').primaryKey(),
	userId: integer('user_id').references(() => users.id),
	folderId: integer('folder_id').references(() => folders.id),
	title: varchar('title', { length: 500 }).notNull(),
	provider: varchar('provider', { length: 50 }).notNull(), // 'openai' or 'anthropic'
	modelConfig: jsonb('model_config').notNull(), // stores ModelConfig as JSON
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	chatId: integer('chat_id').references(() => chats.id).notNull(),
	role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system'
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	chats: many(chats),
	folders: many(folders)
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
	user: one(users, {
		fields: [folders.userId],
		references: [users.id]
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
	messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id]
	})
}));
