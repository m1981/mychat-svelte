# Product & Technical Specification: Multiverse AI Chat Architecture

## 1. Introduction & User Motivation
The standard paradigm for AI chat applications is strictly linear. However, professional prompt engineering is inherently non-linear. Users constantly iterate, tweak previous prompts, adjust temperatures, and explore alternative conversational paths. 

The motivation for this architecture stems from a critical UX failure in existing tools, specifically Google AI Studio. When a user edits a previous prompt in AI Studio, it creates a "branch." However, the system exports these branches as completely separate, disconnected JSON files. Because these files share significant historical context (the "trunk" of the conversation), the user is left with fragmented data. There is no built-in way to view the "multiverse" of their conversation, compare divergent paths, or manage the shared history without massive cognitive overhead and data duplication.

This specification outlines the architecture for a commercial-grade AI Studio clone built from scratch. It is designed to natively support infinite conversational branching, zero data duplication, and a seamless user experience for navigating complex prompt experiments.

## 2. Technical Philosophy & Evolution

### 2.1. The Git Inspiration (And Why We Pivoted)
To solve the problem of branching history, we initially looked to Git. Git solves non-linear history using Content-Addressable Storage (hashing) and a Directed Acyclic Graph (DAG). 

We adopted two brilliant concepts from Git:
1.  **Hashing for Deduplication:** Identifying a piece of data by its content rather than a random UUID.
2.  **Branches as Pointers:** Treating a "timeline" not as a container of messages, but as a lightweight pointer to the latest node in a sequence.

However, we explicitly rejected building a "Git for Chat." Git's DAG architecture is designed for code that diverges and eventually *merges*. AI conversations strictly diverge; they never merge. Furthermore, Git's separation of Commits and Blobs is architectural bloat for text-based chat. Therefore, we pivoted to a vastly simpler, strictly divergent **Tree Data Structure (Adjacency List)** where the structural link and the content reside in the same node.

### 2.2. Insights from Google AI Studio's Internal JSON
By analyzing Google AI Studio's raw export data, we identified several commercial-grade patterns that we incorporated into our model:
*   **Decoupled Artifacts:** Images and documents are not stored as base64 strings in the chat history. They are stored externally (e.g., Google Drive, S3), with only a reference ID kept in the chat node.
*   **First-Class "Thought" Chunks:** Chain-of-Thought reasoning (internal monologues) are treated as distinct, sequential nodes (`isThought: true`) separate from the final output, allowing the UI to easily collapse or expand the AI's reasoning process.
*   **Immutable Run Settings:** Parameters like `temperature`, `topK`, and `model` are attached directly to the specific message node, ensuring historical accuracy even if the user changes settings mid-conversation.

## 3. Core Architecture: The "Multiverse" Model

To support this vision, we fundamentally refactored the standard linear chat database schema into a three-tier hierarchy:

1.  **Workspaces (`chats`):** The top-level container. It holds metadata, tags, and acts as the organizational folder for a specific project. It does *not* hold a linear list of messages.
2.  **Branches (`threads`):** Lightweight pointers. A thread represents a specific timeline or experiment (e.g., "Main", "High Temp Test"). It contains a `headMessageId` which points to the absolute latest message in that specific timeline.
3.  **Tree Nodes (`messages`):** The core entity. Every prompt, thought, or response is an immutable node. 
    *   *The Magic Link:* Each node has a `parentId` pointing to the previous message.
    *   *The Hash ID:* The primary key is a SHA-256 hash of `(parentId + role + content + runSettings)`. This guarantees absolute deduplication. If a user regenerates a prompt from the exact same parent, it yields the same hash, preventing duplicate database rows for shared history.

## 4. User Experience (UX) & Edge Case Handling

Navigating a "multiverse" of chats can easily become a navigational nightmare for the user. We designed specific application-level maneuvers to handle these edge cases:

### 4.1. Navigation & Traversal
When a user opens a Workspace, they select an active Thread. The backend takes the Thread's `headMessageId` and performs a recursive query (walking up the `parentId` chain) to render the linear UI. Switching timelines is instantaneous—the frontend simply swaps the `headMessageId` and renders the new path.

### 4.2. Search & Embeddings (The "Ghost Node" Problem)
Because messages are deduplicated, a vector search might return a node that exists in the shared "trunk" of five different branches. A node does not know which thread it belongs to. 
*   *Resolution:* When a search hits a node, the backend must perform a graph traversal to find all `threads` whose path includes this node. The UI will present the user with the option: *"Found in 3 branches: [Main], [Test 1], [Test 2]. Which timeline would you like to open?"*

### 4.3. Highlights (The Multiverse Superpower)
Because highlights are tied to the deduplicated `messageId` hash, a user highlighting a sentence in the "Main" thread will automatically see that highlight in *every single branch* that shares that node. This provides a magical UX where knowledge persists across divergent timelines.

### 4.4. Notes & Context Scoping
In a linear app, notes are tied to the chat. In a multiverse, tying a note to the Workspace is a bug (a note saying "This hallucinated badly" in an experimental branch would confusingly appear in the successful "Main" branch). 
*   *Resolution:* The `notes` schema was refactored to be optionally scoped. A note always belongs to a Workspace, but can be explicitly pinned to a specific `threadId` or `messageId` to maintain context in divergent timelines.

---

## 5. Database Schema (Drizzle ORM)

Below is the final, production-ready PostgreSQL schema utilizing Drizzle ORM, structured to prevent circular dependencies and enforce the Tree architecture.

```typescript
import { 
  pgTable, text, timestamp, varchar, jsonb, integer, vector, index, boolean, foreignKey 
} from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';
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

// ==========================================
// 2. THE "MULTIVERSE" CHAT ENTITIES
// ==========================================

export const chats = pgTable('chats', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  userId: varchar('user_id', { length: 32 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  folderId: varchar('folder_id', { length: 32 }).references(() => folders.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 100 }).notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const messages = pgTable('messages', {
  id: varchar('id', { length: 64 }).primaryKey(), // SHA-256 Hash
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  parentId: varchar('parent_id', { length: 64 }), 
  
  role: varchar('role', { length: 16, enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  
  isThought: boolean('is_thought').default(false).notNull(),
  runSettings: jsonb('run_settings').$type<{ model: string, temperature: number, topK?: number, topP?: number }>(),
  tokenCount: integer('token_count'),
  
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  chatIdIdx: index('messages_chat_id_idx').on(table.chatId),
  parentIdIdx: index('messages_parent_id_idx').on(table.parentId),
  embeddingIdx: index('messages_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  parentFk: foreignKey({
    columns: [table.parentId],
    foreignColumns: [table.id],
    name: 'messages_parent_id_fk'
  }).onDelete('cascade')
}));

export const threads = pgTable('threads', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).default('Main').notNull(),
  headMessageId: varchar('head_message_id', { length: 64 }).references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const artifacts = pgTable('artifacts', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  messageId: varchar('message_id', { length: 64 }).notNull().references(() => messages.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  storageUrl: text('storage_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ==========================================
// 3. KNOWLEDGE EXTRACTION ENTITIES
// ==========================================

export const notes = pgTable('notes', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  chatId: varchar('chat_id', { length: 32 }).notNull().references(() => chats.id, { onDelete: 'cascade' }),
  threadId: varchar('thread_id', { length: 32 }).references(() => threads.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 64 }).references(() => messages.id, { onDelete: 'cascade' }),
  
  content: text('content').notNull(),
  tags: jsonb('tags').$type<string[]>().default([]).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const highlights = pgTable('highlights', {
  id: varchar('id', { length: 32 }).$defaultFn(() => createId()).primaryKey(),
  messageId: varchar('message_id', { length: 64 }).notNull().references(() => messages.id, { onDelete: 'cascade' }),
  
  text: text('text').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// ==========================================
// 4. EXPORTED TYPES
// ==========================================
export type User = InferSelectModel<typeof users>;
export type Folder = InferSelectModel<typeof folders>;
export type Chat = InferSelectModel<typeof chats>;
export type Message = InferSelectModel<typeof messages>;
export type Thread = InferSelectModel<typeof threads>;
export type Artifact = InferSelectModel<typeof artifacts>;
export type Note = InferSelectModel<typeof notes>;
export type Highlight = InferSelectModel<typeof highlights>;
```

## 6. Implementation Directives
1.  **ID Generation:** The backend must intercept message creation. Do not use `cuid2` for `messages.id`. Use a deterministic hashing function: `crypto.createHash('sha256').update(parentId + role + content + JSON.stringify(runSettings)).digest('hex')`.
2.  **Branching Logic:** When a user edits a historical message, the system must:
    *   Hash the new content to create the new node.
    *   Set the new node's `parentId` to the edited message's parent.
    *   Create a new `Thread` record.
    *   Set the new Thread's `headMessageId` to the newly created node's ID.
3.  **Data Fetching:** Use Recursive CTEs (Common Table Expressions) in PostgreSQL to efficiently walk the tree from `headMessageId` up to the root node when loading a thread for the UI.