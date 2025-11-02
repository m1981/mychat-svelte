import { pgTable, serial, text, timestamp, varchar, jsonb, integer } from 'drizzle-orm/pg-core';
// --- ADD THIS IMPORT ---
import { relations } from 'drizzle-orm';

// We'll add a simple user table for future use, but won't implement auth yet.
export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	// email, etc. will go here later
});

export const chats = pgTable('chats', {
	id: varchar('id', { length: 32 }).primaryKey(), // Using the client-generated ID
	userId: integer('user_id').references(() => users.id), // Foreign key to user
	title: varchar('title', { length: 100 }).notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	folder: varchar('folder', { length: 32 }), // Assuming folder IDs are also strings
	config: jsonb('config').notNull() // Store the ChatConfig object
});

export const messages = pgTable('messages', {
	id: serial('id').primaryKey(),
	chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }), // Cascade delete messages when a chat is deleted
	role: varchar('role', { length: 16, enum: ['user', 'assistant', 'system'] }).notNull(),
	content: text('content').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});


// =================================================================
// RELATIONSHIPS
// Add the entire block below
// =================================================================

export const usersRelations = relations(users, ({ many }) => ({
	// A user can have many chats
	chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
	// A chat belongs to one user
	user: one(users, {
		fields: [chats.userId],
		references: [users.id],
	}),
	// A chat can have many messages
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	// A message belongs to one chat
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id],
	}),
}));