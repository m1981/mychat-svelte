# 🚀 Implementation Plan - Enhanced ChatGPT Clone

**Project:** Multi-feature Chat Management System  
**Implementation Strategy:** Incremental, Test-Driven, Integration-Focused  
**Target:** Production-Ready Application  

---

## 📋 Table of Contents

1. [Prerequisites & Setup](#prerequisites--setup)
2. [Phase 1: Foundation & Database](#phase-1-foundation--database)
3. [Phase 2: Repository Layer](#phase-2-repository-layer)
4. [Phase 3: Service Layer](#phase-3-service-layer)
5. [Phase 4: API Endpoints](#phase-4-api-endpoints)
6. [Phase 5: Store Layer](#phase-5-store-layer)
7. [Phase 6: UI Components - Notes & Highlights](#phase-6-ui-components---notes--highlights)
8. [Phase 7: UI Components - Attachments & Tags](#phase-7-ui-components---attachments--tags)
9. [Phase 8: Search Implementation](#phase-8-search-implementation)
10. [Phase 9: References System](#phase-9-references-system)
11. [Phase 10: Integration & Testing](#phase-10-integration--testing)
12. [Phase 11: Polish & Optimization](#phase-11-polish--optimization)
13. [Integration Checkpoints](#integration-checkpoints)
14. [Validation Matrix](#validation-matrix)

---

## Prerequisites & Setup

### Step 0.1: Install Dependencies

```bash
# Install pgvector extension dependencies
pnpm add @types/pg

# Install additional dependencies
pnpm add uuid nanoid
pnpm add -D @types/uuid
```

**Integration Point:** Verify `package.json` updates

**Validation:**
```bash
pnpm list @types/pg uuid nanoid
```

---

### Step 0.2: Setup PostgreSQL with pgvector

```sql
-- Run in PostgreSQL console
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**Integration Point:** Database connection in `src/lib/server/db/index.ts`

**Validation:**
```typescript
// Test query
const result = await db.execute(sql`SELECT version()`);
console.log('Database connected:', result);
```

---

### Step 0.3: Environment Variables

**File:** `.env`

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/chatgpt_clone"
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
```

**Integration Point:** `src/lib/server/db/index.ts` and `src/lib/server/ai/providers/`

**Validation:**
```typescript
import { env } from '$env/dynamic/private';
if (!env.DATABASE_URL) throw new Error('DATABASE_URL not set');
```

---

## Phase 1: Foundation & Database

### Step 1.1: Update Database Schema

**File:** `src/lib/server/db/schema.ts`

**Action:** Replace existing schema with the enhanced schema from architecture document.

**Key Changes:**
- ✅ Add `folders` table with hierarchy support
- ✅ Add `notes` table with type enum
- ✅ Add `highlights` table with offset tracking
- ✅ Add `attachments` table with type enum
- ✅ Add `tags` table with type enum
- ✅ Add junction tables: `chat_tags`, `message_tags`, `note_tags`
- ✅ Add `embedding` vector columns to `chats` and `messages`
- ✅ Add all relations

**Integration Point:** 
- Imports in API endpoints
- Repository layer implementations

**Code:**
```typescript
// See architecture document for complete schema
// Key additions:

export const folderTypeEnum = pgEnum('folder_type', ['STANDARD', 'ARCHIVE', 'FAVORITE']);
export const attachmentTypeEnum = pgEnum('attachment_type', ['FILE', 'URL', 'IMAGE']);
export const noteTypeEnum = pgEnum('note_type', ['SCRATCH', 'SUMMARY', 'TODO']);
export const tagTypeEnum = pgEnum('tag_type', ['CHAT', 'MESSAGE', 'NOTE']);

// ... complete schema from architecture document
```

**Validation:**
```bash
# Generate migration
pnpm db:generate

# Review migration file in drizzle/migrations/
# Apply migration
pnpm db:push
```

---

### Step 1.2: Update Type Definitions

**File:** `src/lib/types/chat.ts`

**Action:** Enhance existing types with new features.

**Code:**
```typescript
// src/lib/types/chat.ts

export interface Chat {
  id: string;
  userId?: number; // Add for multi-user support
  title: string;
  folderId?: string;
  messages: Message[];
  config: ChatConfig;
  tags: Tag[]; // NEW
  metadata: ChatMetadata; // NEW
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tags: Tag[]; // NEW
  highlights: Highlight[]; // NEW
  embedding?: number[]; // NEW
  createdAt: Date;
}

export interface ChatMetadata {
  tokenCount?: number;
  embedding?: number[];
  lastMessageAt?: Date;
  messageCount?: number;
}

export interface ChatConfig {
  provider: 'openai' | 'anthropic';
  modelConfig: ModelConfig;
}

export interface ModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  top_p: number;
  presence_penalty: number;
  frequency_penalty: number;
}

export interface Folder {
  id: string;
  userId?: number;
  name: string;
  parentId?: string;
  type: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
  expanded: boolean;
  order: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Integration Point:** All components, stores, and services

**Validation:**
```bash
pnpm check
```

---

### Step 1.3: Create New Type Files

**File:** `src/lib/types/note.ts`

```typescript
// src/lib/types/note.ts

import type { Tag } from './chat';

export interface Note {
  id: string;
  chatId: string;
  messageId?: string;
  type: 'SCRATCH' | 'SUMMARY' | 'TODO';
  content: string;
  tags: Tag[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteDTO {
  chatId: string;
  messageId?: string;
  type: 'SCRATCH' | 'SUMMARY' | 'TODO';
  content: string;
  tags?: string[];
}

export interface UpdateNoteDTO {
  content?: string;
  type?: 'SCRATCH' | 'SUMMARY' | 'TODO';
  tags?: string[];
}
```

**File:** `src/lib/types/highlight.ts`

```typescript
// src/lib/types/highlight.ts

export interface Highlight {
  id: string;
  messageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  note?: string;
  createdAt: Date;
}

export interface CreateHighlightDTO {
  messageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color?: string;
  note?: string;
}

export interface UpdateHighlightDTO {
  color?: string;
  note?: string;
}
```

**File:** `src/lib/types/attachment.ts`

```typescript
// src/lib/types/attachment.ts

export interface Attachment {
  id: string;
  chatId: string;
  type: 'FILE' | 'URL' | 'IMAGE';
  content: string;
  metadata: AttachmentMetadata;
  createdAt: Date;
}

export interface AttachmentMetadata {
  filename?: string;
  size?: number;
  mimeType?: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string;
}

export interface CreateAttachmentDTO {
  chatId: string;
  type: 'FILE' | 'URL' | 'IMAGE';
  content: string;
  metadata?: Partial<AttachmentMetadata>;
}
```

**File:** `src/lib/types/tag.ts`

```typescript
// src/lib/types/tag.ts

export interface Tag {
  id: string;
  userId?: number;
  name: string;
  color?: string;
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
  createdAt: Date;
}

export interface CreateTagDTO {
  userId: number;
  name: string;
  color?: string;
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
}
```

**File:** `src/lib/types/search.ts`

```typescript
// src/lib/types/search.ts

import type { Tag } from './chat';

export interface SearchQuery {
  query?: string;
  mode: 'text' | 'semantic' | 'hybrid';
  filters?: SearchFilters;
  pagination?: PaginationParams;
}

export interface SearchFilters {
  chatIds?: string[];
  folderIds?: string[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  types?: ('chat' | 'message' | 'note')[];
  minScore?: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SearchResult {
  type: 'chat' | 'message' | 'note';
  id: string;
  chatId: string;
  chatTitle: string;
  title?: string;
  snippet: string;
  content: string;
  score: number;
  highlights: string[];
  metadata: SearchResultMetadata;
}

export interface SearchResultMetadata {
  createdAt: Date;
  tags?: Tag[];
  messageRole?: 'user' | 'assistant';
  folderId?: string;
  folderName?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  pagination: PaginationResponse;
  took: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}
```

**Integration Point:** All services, API endpoints, and components

**Validation:**
```bash
pnpm check
```

---

## Phase 2: Repository Layer

### Step 2.1: Create Base Repository Interface

**File:** `src/lib/server/repositories/base.repository.ts`

```typescript
// src/lib/server/repositories/base.repository.ts

/**
 * Base repository interface with common CRUD operations
 */
export interface BaseRepository<T, CreateDTO, UpdateDTO> {
  create(data: CreateDTO): Promise<T>;
  findById(id: string | number, userId?: number): Promise<T | null>;
  update(id: string | number, userId: number, data: UpdateDTO): Promise<T>;
  delete(id: string | number, userId: number): Promise<void>;
}

/**
 * Helper to generate unique IDs
 */
export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
```

**Integration Point:** All repository implementations

---

### Step 2.2: Create ChatRepository

**File:** `src/lib/server/repositories/chat.repository.ts`

```typescript
// src/lib/server/repositories/chat.repository.ts

import { db } from '$lib/server/db';
import { chats, messages, chatTags, tags } from '$lib/server/db/schema';
import { eq, and, desc, asc, inArray, like } from 'drizzle-orm';
import type { Chat, Message, ChatConfig, ChatMetadata } from '$lib/types/chat';
import { generateId } from './base.repository';

export interface CreateChatDTO {
  userId: number;
  title?: string;
  folderId?: string;
  config: ChatConfig;
  tags?: string[];
}

export interface UpdateChatDTO {
  title?: string;
  folderId?: string | null;
  config?: Partial<ChatConfig>;
}

export interface FindChatsOptions {
  page?: number;
  limit?: number;
  folderId?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

export class ChatRepository {
  /**
   * Create a new chat
   */
  async create(data: CreateChatDTO): Promise<Chat> {
    const chatId = generateId('chat');
    
    const [newChat] = await db.insert(chats).values({
      id: chatId,
      userId: data.userId,
      title: data.title || 'New Chat',
      folderId: data.folderId,
      config: data.config as any, // Cast for JSONB
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Handle tags if provided
    if (data.tags && data.tags.length > 0) {
      await this.updateTags(chatId, data.tags, data.userId);
    }

    return this.mapToDomain(newChat, [], []);
  }

  /**
   * Find chat by ID with full details
   */
  async findById(chatId: string, userId: number): Promise<Chat | null> {
    const result = await db.query.chats.findFirst({
      where: and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ),
      with: {
        messages: {
          orderBy: [asc(messages.createdAt)],
          with: {
            highlights: true,
            messageTags: {
              with: { tag: true }
            }
          }
        },
        chatTags: {
          with: { tag: true }
        },
        notes: true,
        attachments: true
      }
    });

    if (!result) return null;

    return this.mapToDomain(
      result,
      result.messages || [],
      result.chatTags?.map(ct => ct.tag) || []
    );
  }

  /**
   * Find all chats for a user with pagination
   */
  async findByUserId(
    userId: number,
    options: FindChatsOptions = {}
  ): Promise<{ chats: Chat[]; total: number }> {
    const {
      page = 0,
      limit = 50,
      folderId,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = options;

    const whereConditions = [eq(chats.userId, userId)];
    
    if (folderId) {
      whereConditions.push(eq(chats.folderId, folderId));
    }

    const orderBy = sortOrder === 'desc' 
      ? desc(chats[sortBy]) 
      : asc(chats[sortBy]);

    const results = await db.query.chats.findMany({
      where: and(...whereConditions),
      orderBy: [orderBy],
      limit,
      offset: page * limit,
      with: {
        chatTags: {
          with: { tag: true }
        }
      }
    });

    // Get total count
    const totalResult = await db
      .select({ count: chats.id })
      .from(chats)
      .where(and(...whereConditions));

    return {
      chats: results.map(r => this.mapToDomain(r, [], r.chatTags?.map(ct => ct.tag) || [])),
      total: totalResult.length
    };
  }

  /**
   * Update chat metadata
   */
  async update(chatId: string, userId: number, data: UpdateChatDTO): Promise<Chat> {
    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.folderId !== undefined) updateData.folderId = data.folderId;
    if (data.config) {
      // Merge config
      const existing = await this.findById(chatId, userId);
      if (existing) {
        updateData.config = { ...existing.config, ...data.config };
      }
    }

    await db
      .update(chats)
      .set(updateData)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));

    const updated = await this.findById(chatId, userId);
    if (!updated) throw new Error('Chat not found after update');
    
    return updated;
  }

  /**
   * Delete a chat (cascade deletes messages, notes, etc.)
   */
  async delete(chatId: string, userId: number): Promise<void> {
    await db
      .delete(chats)
      .where(and(
        eq(chats.id, chatId),
        eq(chats.userId, userId)
      ));
  }

  /**
   * Add a message to a chat
   */
  async addMessage(
    chatId: string,
    role: 'user' | 'assistant' | 'system',
    content: string
  ): Promise<Message> {
    const [message] = await db.insert(messages).values({
      chatId,
      role,
      content,
      createdAt: new Date()
    }).returning();

    // Update chat's updatedAt
    await db
      .update(chats)
      .set({ updatedAt: new Date() })
      .where(eq(chats.id, chatId));

    return {
      id: message.id.toString(),
      chatId: message.chatId,
      role: message.role as 'user' | 'assistant' | 'system',
      content: message.content,
      tags: [],
      highlights: [],
      createdAt: message.createdAt
    };
  }

  /**
   * Update chat tags
   */
  private async updateTags(chatId: string, tagNames: string[], userId: number): Promise<void> {
    // Delete existing tags
    await db.delete(chatTags).where(eq(chatTags.chatId, chatId));

    if (tagNames.length === 0) return;

    // Find or create tags
    const tagRecords = await Promise.all(
      tagNames.map(async (name) => {
        const existing = await db.query.tags.findFirst({
          where: and(
            eq(tags.name, name),
            eq(tags.userId, userId),
            eq(tags.type, 'CHAT')
          )
        });

        if (existing) return existing;

        const [newTag] = await db.insert(tags).values({
          userId,
          name,
          type: 'CHAT',
          createdAt: new Date()
        }).returning();

        return newTag;
      })
    );

    // Create associations
    await db.insert(chatTags).values(
      tagRecords.map(tag => ({
        chatId,
        tagId: tag.id,
        createdAt: new Date()
      }))
    );
  }

  /**
   * Map database record to domain model
   */
  private mapToDomain(
    record: any,
    messagesData: any[] = [],
    tagsData: any[] = []
  ): Chat {
    return {
      id: record.id,
      userId: record.userId,
      title: record.title,
      folderId: record.folderId,
      messages: messagesData.map(m => ({
        id: m.id.toString(),
        chatId: m.chatId,
        role: m.role,
        content: m.content,
        tags: m.messageTags?.map((mt: any) => ({
          id: mt.tag.id.toString(),
          name: mt.tag.name,
          color: mt.tag.color,
          type: mt.tag.type
        })) || [],
        highlights: m.highlights || [],
        createdAt: m.createdAt
      })),
      config: record.config,
      tags: tagsData.map(t => ({
        id: t.id.toString(),
        name: t.name,
        color: t.color,
        type: t.type,
        createdAt: t.createdAt
      })),
      metadata: record.metadata || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

// Export singleton instance
export const chatRepository = new ChatRepository();
```

**Integration Point:** Service layer (ChatService), API endpoints

**Validation:**
```typescript
// Test in a route or script
import { chatRepository } from '$lib/server/repositories/chat.repository';

const chat = await chatRepository.create({
  userId: 1,
  title: 'Test Chat',
  config: { /* ... */ }
});
console.log('Created chat:', chat);
```

---

### Step 2.3: Create NoteRepository

**File:** `src/lib/server/repositories/note.repository.ts`

```typescript
// src/lib/server/repositories/note.repository.ts

import { db } from '$lib/server/db';
import { notes, noteTags, tags } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { generateId } from './base.repository';

export class NoteRepository {
  async create(data: CreateNoteDTO): Promise<Note> {
    const noteId = generateId('note');

    const [note] = await db.insert(notes).values({
      id: noteId,
      chatId: data.chatId,
      messageId: data.messageId,
      type: data.type,
      content: data.content,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    // Handle tags
    if (data.tags && data.tags.length > 0) {
      await this.updateTags(noteId, data.tags);
    }

    return this.mapToDomain(note, []);
  }

  async findById(noteId: string): Promise<Note | null> {
    const result = await db.query.notes.findFirst({
      where: eq(notes.id, noteId),
      with: {
        noteTags: {
          with: { tag: true }
        }
      }
    });

    if (!result) return null;

    return this.mapToDomain(
      result,
      result.noteTags?.map(nt => nt.tag) || []
    );
  }

  async findByChatId(chatId: string): Promise<Note[]> {
    const results = await db.query.notes.findMany({
      where: eq(notes.chatId, chatId),
      with: {
        noteTags: {
          with: { tag: true }
        }
      }
    });

    return results.map(r => 
      this.mapToDomain(r, r.noteTags?.map(nt => nt.tag) || [])
    );
  }

  async findByMessageId(messageId: number): Promise<Note[]> {
    const results = await db.query.notes.findMany({
      where: eq(notes.messageId, messageId),
      with: {
        noteTags: {
          with: { tag: true }
        }
      }
    });

    return results.map(r => 
      this.mapToDomain(r, r.noteTags?.map(nt => nt.tag) || [])
    );
  }

  async update(noteId: string, data: UpdateNoteDTO): Promise<Note> {
    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.content !== undefined) updateData.content = data.content;
    if (data.type !== undefined) updateData.type = data.type;

    await db
      .update(notes)
      .set(updateData)
      .where(eq(notes.id, noteId));

    if (data.tags) {
      await this.updateTags(noteId, data.tags);
    }

    const updated = await this.findById(noteId);
    if (!updated) throw new Error('Note not found after update');

    return updated;
  }

  async delete(noteId: string): Promise<void> {
    await db.delete(notes).where(eq(notes.id, noteId));
  }

  private async updateTags(noteId: string, tagNames: string[]): Promise<void> {
    // Implementation similar to ChatRepository.updateTags
    // ... (see full implementation in ChatRepository)
  }

  private mapToDomain(record: any, tagsData: any[]): Note {
    return {
      id: record.id,
      chatId: record.chatId,
      messageId: record.messageId?.toString(),
      type: record.type,
      content: record.content,
      tags: tagsData.map(t => ({
        id: t.id.toString(),
        name: t.name,
        color: t.color,
        type: t.type,
        createdAt: t.createdAt
      })),
      createdAt: record.createdAt,
      updatedAt: record.updatedAt
    };
  }
}

export const noteRepository = new NoteRepository();
```

**Integration Point:** NoteService, API endpoints

---

### Step 2.4: Create HighlightRepository

**File:** `src/lib/server/repositories/highlight.repository.ts`

```typescript
// src/lib/server/repositories/highlight.repository.ts

import { db } from '$lib/server/db';
import { highlights, messages } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { generateId } from './base.repository';

export class HighlightRepository {
  async create(data: CreateHighlightDTO): Promise<Highlight> {
    // Validate offsets
    await this.validateOffsets(
      parseInt(data.messageId),
      data.startOffset,
      data.endOffset,
      data.text
    );

    const highlightId = generateId('highlight');

    const [highlight] = await db.insert(highlights).values({
      id: highlightId,
      messageId: parseInt(data.messageId),
      text: data.text,
      startOffset: data.startOffset,
      endOffset: data.endOffset,
      color: data.color || '#FFFF00',
      note: data.note,
      createdAt: new Date()
    }).returning();

    return this.mapToDomain(highlight);
  }

  async findById(highlightId: string): Promise<Highlight | null> {
    const result = await db.query.highlights.findFirst({
      where: eq(highlights.id, highlightId)
    });

    return result ? this.mapToDomain(result) : null;
  }

  async findByMessageId(messageId: string): Promise<Highlight[]> {
    const results = await db.query.highlights.findMany({
      where: eq(highlights.messageId, parseInt(messageId))
    });

    return results.map(r => this.mapToDomain(r));
  }

  async update(highlightId: string, data: UpdateHighlightDTO): Promise<Highlight> {
    const updateData: any = {};

    if (data.color !== undefined) updateData.color = data.color;
    if (data.note !== undefined) updateData.note = data.note;

    await db
      .update(highlights)
      .set(updateData)
      .where(eq(highlights.id, highlightId));

    const updated = await this.findById(highlightId);
    if (!updated) throw new Error('Highlight not found after update');

    return updated;
  }

  async delete(highlightId: string): Promise<void> {
    await db.delete(highlights).where(eq(highlights.id, highlightId));
  }

  private async validateOffsets(
    messageId: number,
    startOffset: number,
    endOffset: number,
    text: string
  ): Promise<void> {
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId)
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (startOffset < 0 || endOffset > message.content.length) {
      throw new Error('Invalid offsets');
    }

    if (startOffset >= endOffset) {
      throw new Error('Start offset must be less than end offset');
    }

    const actualText = message.content.substring(startOffset, endOffset);
    if (actualText !== text) {
      throw new Error('Highlight text does not match message content at specified offsets');
    }
  }

  private mapToDomain(record: any): Highlight {
    return {
      id: record.id,
      messageId: record.messageId.toString(),
      text: record.text,
      startOffset: record.startOffset,
      endOffset: record.endOffset,
      color: record.color,
      note: record.note,
      createdAt: record.createdAt
    };
  }
}

export const highlightRepository = new HighlightRepository();
```

**Integration Point:** HighlightService, API endpoints

---

### Step 2.5: Create AttachmentRepository & TagRepository

**Files:**
- `src/lib/server/repositories/attachment.repository.ts`
- `src/lib/server/repositories/tag.repository.ts`

**Code:** Similar patterns to above repositories. See api_contracts.md for interfaces.

**Integration Point:** Service layer, API endpoints

---

## Phase 3: Service Layer

### Step 3.1: Create ChatService

**File:** `src/lib/server/services/chat.service.ts`

```typescript
// src/lib/server/services/chat.service.ts

import { chatRepository } from '$lib/server/repositories/chat.repository';
import { getAIProvider } from '$lib/server/ai/providers';
import type { Chat, ChatConfig, Reference } from '$lib/types/chat';
import type { CreateChatDTO, UpdateChatDTO } from '$lib/server/repositories/chat.repository';

export class ChatService {
  /**
   * Create a new chat
   */
  async createChat(userId: number, data: Omit<CreateChatDTO, 'userId'>): Promise<Chat> {
    return chatRepository.create({ ...data, userId });
  }

  /**
   * Get a chat by ID
   */
  async getChat(chatId: string, userId: number): Promise<Chat> {
    const chat = await chatRepository.findById(chatId, userId);
    if (!chat) {
      throw new Error('Chat not found');
    }
    return chat;
  }

  /**
   * Update chat metadata
   */
  async updateChat(chatId: string, userId: number, data: UpdateChatDTO): Promise<Chat> {
    return chatRepository.update(chatId, userId, data);
  }

  /**
   * Delete a chat
   */
  async deleteChat(chatId: string, userId: number): Promise<void> {
    return chatRepository.delete(chatId, userId);
  }

  /**
   * Generate AI response with streaming
   */
  async generateResponse(
    chatId: string,
    userMessage: string,
    references: Reference[],
    config: ChatConfig
  ): Promise<ReadableStream> {
    // 1. Add user message to chat
    await chatRepository.addMessage(chatId, 'user', userMessage);

    // 2. Build context from references
    const context = await this.buildContextFromReferences(references);

    // 3. Get conversation history
    const chat = await chatRepository.findById(chatId, 1); // TODO: Get actual userId
    if (!chat) throw new Error('Chat not found');

    // 4. Prepare messages for AI
    const messagesForAI = chat.messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Add context if present
    if (context) {
      messagesForAI.unshift({
        role: 'system',
        content: context
      });
    }

    // 5. Get AI provider and generate stream
    const provider = getAIProvider(config.provider);
    return provider.generate(chatId, messagesForAI as any, config.modelConfig);
  }

  /**
   * Build context string from references
   */
  async buildContextFromReferences(references: Reference[]): Promise<string> {
    if (references.length === 0) return '';

    let context = '--- Context from References ---\n\n';

    for (const ref of references) {
      if (ref.type === 'CHAT') {
        const chat = await chatRepository.findById(ref.targetId, 1); // TODO: userId
        if (chat) {
          context += `[Chat: ${chat.title}]\n`;
          context += chat.messages
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
          context += '\n\n';
        }
      } else if (ref.type === 'FOLDER') {
        const { chats } = await chatRepository.findByUserId(1, { // TODO: userId
          folderId: ref.targetId,
          limit: 10
        });
        context += `[Folder: ${ref.title}] (${chats.length} chats)\n`;
        context += chats.map(c => `- ${c.title}`).join('\n');
        context += '\n\n';
      }
    }

    context += '--- End Context ---\n\n';
    return context;
  }
}

export const chatService = new ChatService();
```

**Integration Point:** API endpoints (`/api/chats/*`)

---

### Step 3.2: Create SearchService

**File:** `src/lib/server/services/search.service.ts`

```typescript
// src/lib/server/services/search.service.ts

import { db } from '$lib/server/db';
import { chats, messages, notes } from '$lib/server/db/schema';
import { eq, and, or, like, sql } from 'drizzle-orm';
import type { SearchQuery, SearchResult, SearchResponse } from '$lib/types/search';

export class SearchService {
  /**
   * Multi-modal search
   */
  async search(query: SearchQuery, userId: number): Promise<SearchResponse> {
    const startTime = Date.now();
    let results: SearchResult[] = [];

    if (query.mode === 'text' && query.query) {
      results = await this.textSearch(query.query, userId, query.filters);
    } else if (query.mode === 'semantic' && query.query) {
      results = await this.semanticSearch(query.query, userId, query.filters);
    } else if (query.mode === 'hybrid' && query.query) {
      const textResults = await this.textSearch(query.query, userId, query.filters);
      const semanticResults = await this.semanticSearch(query.query, userId, query.filters);
      results = this.mergeResults(textResults, semanticResults);
    }

    // Apply pagination
    const page = query.pagination?.page || 0;
    const limit = query.pagination?.limit || 20;
    const paginatedResults = results.slice(page * limit, (page + 1) * limit);

    return {
      results: paginatedResults,
      pagination: {
        page,
        limit,
        total: results.length,
        hasMore: (page + 1) * limit < results.length
      },
      took: Date.now() - startTime
    };
  }

  /**
   * Full-text search
   */
  private async textSearch(
    query: string,
    userId: number,
    filters?: any
  ): Promise<SearchResult[]> {
    const searchTerm = `%${query}%`;

    const results = await db
      .select({
        chatId: chats.id,
        chatTitle: chats.title,
        messageId: messages.id,
        messageContent: messages.content,
        messageRole: messages.role,
        createdAt: messages.createdAt
      })
      .from(chats)
      .leftJoin(messages, eq(messages.chatId, chats.id))
      .where(
        and(
          eq(chats.userId, userId),
          or(
            like(chats.title, searchTerm),
            like(messages.content, searchTerm)
          )
        )
      )
      .limit(50);

    return results.map(r => ({
      type: 'message' as const,
      id: r.messageId?.toString() || r.chatId,
      chatId: r.chatId,
      chatTitle: r.chatTitle,
      snippet: this.createSnippet(r.messageContent || '', query),
      content: r.messageContent || '',
      score: this.calculateTextScore(r.messageContent || '', query),
      highlights: this.extractHighlights(r.messageContent || '', query),
      metadata: {
        createdAt: r.createdAt || new Date(),
        messageRole: r.messageRole as 'user' | 'assistant'
      }
    }));
  }

  /**
   * Semantic search using embeddings
   */
  private async semanticSearch(
    query: string,
    userId: number,
    filters?: any
  ): Promise<SearchResult[]> {
    // TODO: Generate embedding for query using OpenAI
    // TODO: Use pgvector to find similar messages
    // For now, return empty array
    return [];
  }

  /**
   * Merge and deduplicate results
   */
  private mergeResults(
    textResults: SearchResult[],
    semanticResults: SearchResult[]
  ): SearchResult[] {
    const merged = new Map<string, SearchResult>();

    // Add text results
    textResults.forEach(r => {
      const key = `${r.type}-${r.id}`;
      merged.set(key, r);
    });

    // Add semantic results (combine scores if duplicate)
    semanticResults.forEach(r => {
      const key = `${r.type}-${r.id}`;
      const existing = merged.get(key);
      
      if (existing) {
        existing.score = (existing.score + r.score) / 2;
      } else {
        merged.set(key, r);
      }
    });

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Create snippet with context
   */
  private createSnippet(content: string, query: string, contextLength = 100): string {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return content.substring(0, contextLength) + '...';

    const start = Math.max(0, index - contextLength / 2);
    const end = Math.min(content.length, index + query.length + contextLength / 2);

    return (start > 0 ? '...' : '') +
           content.substring(start, end) +
           (end < content.length ? '...' : '');
  }

  /**
   * Calculate relevance score
   */
  private calculateTextScore(content: string, query: string): number {
    const matches = (content.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
    return Math.min(matches / 10, 1.0);
  }

  /**
   * Extract highlight snippets
   */
  private extractHighlights(content: string, query: string): string[] {
    const regex = new RegExp(`(.{0,30}${query}.{0,30})`, 'gi');
    const matches = content.match(regex) || [];
    return matches.slice(0, 3);
  }
}

export const searchService = new SearchService();
```

**Integration Point:** API endpoint (`/api/search`)

---

### Step 3.3: Create Additional Services

**Files:**
- `src/lib/server/services/note.service.ts`
- `src/lib/server/services/highlight.service.ts`
- `src/lib/server/services/attachment.service.ts`
- `src/lib/server/services/embedding.service.ts`

**Pattern:** Each service wraps its repository and adds business logic.

**Integration Point:** API endpoints

---

## Phase 4: API Endpoints

### Step 4.1: Update Chat Generation Endpoint

**File:** `src/routes/api/chat/generate/+server.ts`

**Action:** Enhance to use ChatService

```typescript
// src/routes/api/chat/generate/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { chatService } from '$lib/server/services/chat.service';
import { AppError } from '$lib/utils/error-handler';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // Validate
    if (!body.chatId || !body.message) {
      throw new AppError('Missing required fields', 'VALIDATION_ERROR', 400);
    }

    // TODO: Get actual userId from session
    const userId = 1;

    // Generate response stream
    const stream = await chatService.generateResponse(
      body.chatId,
      body.message,
      body.references || [],
      body.config
    );

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    const statusCode = error instanceof AppError ? error.statusCode : 500;
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return json({ message }, { status: statusCode || 500 });
  }
};
```

**Integration Point:** Frontend MessageComposer, StreamingService

---

### Step 4.2: Create Notes API Endpoints

**File:** `src/routes/api/notes/+server.ts`

```typescript
// src/routes/api/notes/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { noteRepository } from '$lib/server/repositories/note.repository';
import type { CreateNoteDTO } from '$lib/types/note';
import { AppError } from '$lib/utils/error-handler';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const chatId = url.searchParams.get('chatId');
    const messageId = url.searchParams.get('messageId');

    if (chatId) {
      const notes = await noteRepository.findByChatId(chatId);
      return json({ data: notes, total: notes.length });
    }

    if (messageId) {
      const notes = await noteRepository.findByMessageId(parseInt(messageId));
      return json({ data: notes, total: notes.length });
    }

    throw new AppError('chatId or messageId required', 'VALIDATION_ERROR', 400);

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: CreateNoteDTO = await request.json();

    // Validate
    if (!data.chatId || !data.content) {
      throw new AppError('Missing required fields', 'VALIDATION_ERROR', 400);
    }

    const note = await noteRepository.create(data);
    return json(note, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};
```

**File:** `src/routes/api/notes/[id]/+server.ts`

```typescript
// src/routes/api/notes/[id]/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { noteRepository } from '$lib/server/repositories/note.repository';
import type { UpdateNoteDTO } from '$lib/types/note';
import { AppError } from '$lib/utils/error-handler';

export const PATCH: RequestHandler = async ({ params, request }) => {
  try {
    const noteId = params.id;
    const data: UpdateNoteDTO = await request.json();

    const note = await noteRepository.update(noteId, data);
    return json(note);

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const noteId = params.id;
    await noteRepository.delete(noteId);
    return new Response(null, { status: 204 });

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
};
```

**Integration Point:** Frontend note stores and components

---

### Step 4.3: Create Highlights API Endpoints

**File:** `src/routes/api/highlights/+server.ts`

```typescript
// src/routes/api/highlights/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { highlightRepository } from '$lib/server/repositories/highlight.repository';
import type { CreateHighlightDTO } from '$lib/types/highlight';
import { AppError } from '$lib/utils/error-handler';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const messageId = url.searchParams.get('messageId');
    
    if (!messageId) {
      throw new AppError('messageId required', 'VALIDATION_ERROR', 400);
    }

    const highlights = await highlightRepository.findByMessageId(messageId);
    return json({ data: highlights, total: highlights.length });

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const data: CreateHighlightDTO = await request.json();

    // Validate
    if (!data.messageId || !data.text || data.startOffset === undefined || data.endOffset === undefined) {
      throw new AppError('Missing required fields', 'VALIDATION_ERROR', 400);
    }

    const highlight = await highlightRepository.create(data);
    return json(highlight, { status: 201 });

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};
```

**File:** `src/routes/api/highlights/[id]/+server.ts`

```typescript
// Similar pattern to notes/[id]/+server.ts
// PATCH and DELETE handlers
```

**Integration Point:** Frontend highlight stores and text selection components

---

### Step 4.4: Create Search API Endpoint

**File:** `src/routes/api/search/+server.ts`

```typescript
// src/routes/api/search/+server.ts

import { json, type RequestHandler } from '@sveltejs/kit';
import { searchService } from '$lib/server/services/search.service';
import type { SearchQuery } from '$lib/types/search';
import { AppError } from '$lib/utils/error-handler';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const query: SearchQuery = await request.json();

    // Validate
    if (!query.mode) {
      throw new AppError('Search mode required', 'VALIDATION_ERROR', 400);
    }

    // TODO: Get actual userId from session
    const userId = 1;

    const response = await searchService.search(query, userId);
    return json(response);

  } catch (error) {
    console.error('API Error:', error);
    return json(
      { message: error instanceof Error ? error.message : 'Internal error' },
      { status: error instanceof AppError ? error.statusCode : 500 }
    );
  }
};
```

**Integration Point:** Frontend search components and stores

---

### Step 4.5: Create Additional API Endpoints

**Files:**
- `src/routes/api/chats/+server.ts` (GET, POST)
- `src/routes/api/chats/[id]/+server.ts` (GET, PATCH, DELETE)
- `src/routes/api/folders/+server.ts` (GET, POST)
- `src/routes/api/folders/[id]/+server.ts` (GET, PATCH, DELETE)
- `src/routes/api/attachments/+server.ts` (GET, POST)
- `src/routes/api/attachments/[id]/+server.ts` (DELETE)
- `src/routes/api/tags/+server.ts` (GET, POST)
- `src/routes/api/tags/[id]/+server.ts` (DELETE)

**Pattern:** Follow same structure as notes and highlights endpoints.

**Integration Point:** Frontend stores

---

## Phase 5: Store Layer

### Step 5.1: Create Note Store

**File:** `src/lib/stores/note.store.ts`

```typescript
// src/lib/stores/note.store.ts

import { writable } from 'svelte/store';
import type { Note, CreateNoteDTO, UpdateNoteDTO } from '$lib/types/note';
import { handleError, withErrorHandling } from '$lib/utils/error-handler';
import { toast } from './toast.store';

function createNoteStore() {
  const { subscribe, set, update } = writable<Note[]>([]);

  return {
    subscribe,

    /**
     * Load notes for a chat
     */
    async loadByChatId(chatId: string): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/notes?chatId=${chatId}`);
          if (!response.ok) throw new Error('Failed to load notes');

          const data = await response.json();
          set(data.data);
        },
        {
          errorMessage: 'Failed to load notes',
          showToast: true
        }
      );
    },

    /**
     * Create a new note
     */
    async create(data: CreateNoteDTO): Promise<Note | null> {
      return withErrorHandling(
        async () => {
          const response = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) throw new Error('Failed to create note');

          const note = await response.json();

          update(notes => [...notes, note]);
          toast.success('Note created');

          return note;
        },
        {
          errorMessage: 'Failed to create note',
          showToast: true
        }
      );
    },

    /**
     * Update a note
     */
    async update(noteId: string, data: UpdateNoteDTO): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/notes/${noteId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) throw new Error('Failed to update note');

          const updatedNote = await response.json();

          update(notes =>
            notes.map(n => n.id === noteId ? updatedNote : n)
          );

          toast.success('Note updated');
        },
        {
          errorMessage: 'Failed to update note',
          showToast: true
        }
      );
    },

    /**
     * Delete a note
     */
    async delete(noteId: string): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/notes/${noteId}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Failed to delete note');

          update(notes => notes.filter(n => n.id !== noteId));
          toast.success('Note deleted');
        },
        {
          errorMessage: 'Failed to delete note',
          showToast: true
        }
      );
    },

    /**
     * Clear all notes
     */
    clear(): void {
      set([]);
    }
  };
}

export const notes = createNoteStore();
```

**Integration Point:** UI components (NotesList, NoteEditor)

---

### Step 5.2: Create Highlight Store

**File:** `src/lib/stores/highlight.store.ts`

```typescript
// src/lib/stores/highlight.store.ts

import { writable } from 'svelte/store';
import type { Highlight, CreateHighlightDTO, UpdateHighlightDTO } from '$lib/types/highlight';
import { handleError, withErrorHandling } from '$lib/utils/error-handler';
import { toast } from './toast.store';

function createHighlightStore() {
  const { subscribe, set, update } = writable<Highlight[]>([]);

  return {
    subscribe,

    /**
     * Load highlights for a message
     */
    async loadByMessageId(messageId: string): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/highlights?messageId=${messageId}`);
          if (!response.ok) throw new Error('Failed to load highlights');

          const data = await response.json();
          update(existing => {
            // Merge with existing highlights from other messages
            const filtered = existing.filter(h => h.messageId !== messageId);
            return [...filtered, ...data.data];
          });
        },
        {
          errorMessage: 'Failed to load highlights',
          showToast: false // Silent load
        }
      );
    },

    /**
     * Create a new highlight
     */
    async create(data: CreateHighlightDTO): Promise<Highlight | null> {
      return withErrorHandling(
        async () => {
          const response = await fetch('/api/highlights', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create highlight');
          }

          const highlight = await response.json();

          update(highlights => [...highlights, highlight]);
          toast.success('Highlight created');

          return highlight;
        },
        {
          errorMessage: 'Failed to create highlight',
          showToast: true
        }
      );
    },

    /**
     * Update a highlight
     */
    async update(highlightId: string, data: UpdateHighlightDTO): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/highlights/${highlightId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });

          if (!response.ok) throw new Error('Failed to update highlight');

          const updatedHighlight = await response.json();

          update(highlights =>
            highlights.map(h => h.id === highlightId ? updatedHighlight : h)
          );

          toast.success('Highlight updated');
        },
        {
          errorMessage: 'Failed to update highlight',
          showToast: true
        }
      );
    },

    /**
     * Delete a highlight
     */
    async delete(highlightId: string): Promise<void> {
      await withErrorHandling(
        async () => {
          const response = await fetch(`/api/highlights/${highlightId}`, {
            method: 'DELETE'
          });

          if (!response.ok) throw new Error('Failed to delete highlight');

          update(highlights => highlights.filter(h => h.id !== highlightId));
          toast.success('Highlight deleted');
        },
        {
          errorMessage: 'Failed to delete highlight',
          showToast: true
        }
      );
    },

    /**
     * Clear all highlights
     */
    clear(): void {
      set([]);
    }
  };
}

export const highlights = createHighlightStore();
```

**Integration Point:** UI components (MessageItem with text selection, HighlightsList)

---

### Step 5.3: Create Additional Stores

**Files:**
- `src/lib/stores/attachment.store.ts`
- `src/lib/stores/tag.store.ts`
- `src/lib/stores/reference.store.ts`
- `src/lib/stores/search.store.ts`

**Pattern:** Similar to note.store.ts and highlight.store.ts

**Integration Point:** UI components

---

### Step 5.4: Update UI Store for Sidebar Tabs

**File:** `src/lib/stores/ui.store.ts`

```typescript
// src/lib/stores/ui.store.ts

import { writable } from 'svelte/store';

export const hideSideMenu = writable(false);

// NEW: Secondary panel state
export const secondaryPanelTab = writable<'highlights' | 'notes' | 'attachments'>('highlights');
export const showSecondaryPanel = writable(true);
```

**Integration Point:** SecondaryPanel component

---

## Phase 6: UI Components - Notes & Highlights

### Step 6.1: Create SecondaryPanel Layout

**File:** `src/lib/components/layout/SecondaryPanel.svelte`

```svelte
<!-- src/lib/components/layout/SecondaryPanel.svelte -->
<script lang="ts">
	import { secondaryPanelTab, showSecondaryPanel } from '$lib/stores/ui.store';
	import { currentChatIndex, chats } from '$lib/stores/chat.store';
	import { highlights } from '$lib/stores/highlight.store';
	import { notes } from '$lib/stores/note.store';
	import { attachments } from '$lib/stores/attachment.store';
	import HighlightsList from '$lib/components/sidebar/HighlightsList.svelte';
	import NotesList from '$lib/components/sidebar/NotesList.svelte';
	import AttachmentsList from '$lib/components/sidebar/AttachmentsList.svelte';

	const currentChat = $derived($chats[$currentChatIndex]);

	// Filter data for current chat
	const currentHighlights = $derived(
		currentChat ? $highlights.filter(h => 
			currentChat.messages.some(m => m.id === h.messageId)
		) : []
	);

	const currentNotes = $derived(
		currentChat ? $notes.filter(n => n.chatId === currentChat.id) : []
	);

	const currentAttachments = $derived(
		currentChat ? $attachments.filter(a => a.chatId === currentChat.id) : []
	);

	// Load data when chat changes
	$effect(() => {
		if (currentChat) {
			notes.loadByChatId(currentChat.id);
			attachments.loadByChatId(currentChat.id);
			// Highlights load per message
		}
	});
</script>

{#if $showSecondaryPanel}
<aside class="w-80 bg-base-100 border-l border-base-300 flex flex-col overflow-hidden">
	<!-- Tabs -->
	<div class="tabs tabs-boxed p-2 bg-base-200">
		<button 
			class="tab {$secondaryPanelTab === 'highlights' ? 'tab-active' : ''}"
			onclick={() => secondaryPanelTab.set('highlights')}
		>
			🖍️ Highlights ({currentHighlights.length})
		</button>
		<button 
			class="tab {$secondaryPanelTab === 'notes' ? 'tab-active' : ''}"
			onclick={() => secondaryPanelTab.set('notes')}
		>
			📝 Notes ({currentNotes.length})
		</button>
		<button 
			class="tab {$secondaryPanelTab === 'attachments' ? 'tab-active' : ''}"
			onclick={() => secondaryPanelTab.set('attachments')}
		>
			📎 Files ({currentAttachments.length})
		</button>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-y-auto p-4">
		{#if !currentChat}
			<div class="text-center text-base-content/50 mt-12">
				<p>Select a chat to view content</p>
			</div>
		{:else if $secondaryPanelTab === 'highlights'}
			<HighlightsList highlights={currentHighlights} />
		{:else if $secondaryPanelTab === 'notes'}
			<NotesList notes={currentNotes} chatId={currentChat.id} />
		{:else if $secondaryPanelTab === 'attachments'}
			<AttachmentsList attachments={currentAttachments} chatId={currentChat.id} />
		{/if}
	</div>
</aside>
{/if}
```

**Integration Point:** +layout.svelte

---

### Step 6.2: Create HighlightsList Component

**File:** `src/lib/components/sidebar/HighlightsList.svelte`

```svelte
<!-- src/lib/components/sidebar/HighlightsList.svelte -->
<script lang="ts">
	import type { Highlight } from '$lib/types/highlight';
	import { highlights as highlightStore } from '$lib/stores/highlight.store';

	let { highlights }: { highlights: Highlight[] } = $props();

	function jumpToHighlight(highlight: Highlight) {
		// Scroll to message in chat view
		const element = document.querySelector(`[data-message-id="${highlight.messageId}"]`);
		element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	function deleteHighlight(highlightId: string) {
		if (confirm('Delete this highlight?')) {
			highlightStore.delete(highlightId);
		}
	}
</script>

<div class="space-y-4">
	{#if highlights.length === 0}
		<div class="text-center text-base-content/50">
			<p class="text-sm">No highlights yet</p>
			<p class="text-xs mt-1">Select text in messages to create highlights</p>
		</div>
	{:else}
		{#each highlights as highlight (highlight.id)}
			<div 
				class="card bg-base-200 shadow-sm cursor-pointer hover:bg-base-300 transition-colors"
				onclick={() => jumpToHighlight(highlight)}
			>
				<div class="card-body p-3">
					<!-- Highlight text with color indicator -->
					<div class="flex gap-2">
						<div 
							class="w-1 rounded"
							style="background-color: {highlight.color}"
						></div>
						<div class="flex-1">
							<p class="text-sm" style="background-color: {highlight.color}33; padding: 2px 4px; border-radius: 2px;">
								"{highlight.text}"
							</p>
							{#if highlight.note}
								<p class="text-xs text-base-content/70 mt-2">
									💬 {highlight.note}
								</p>
							{/if}
							<p class="text-xs text-base-content/50 mt-1">
								{new Date(highlight.createdAt).toLocaleDateString()}
							</p>
						</div>
					</div>

					<!-- Actions -->
					<div class="card-actions justify-end mt-2">
						<button 
							class="btn btn-ghost btn-xs"
							onclick={(e) => {
								e.stopPropagation();
								deleteHighlight(highlight.id);
							}}
						>
							🗑️ Delete
						</button>
					</div>
				</div>
			</div>
		{/each}
	{/if}
</div>
```

**Integration Point:** SecondaryPanel

---

### Step 6.3: Create NotesList Component

**File:** `src/lib/components/sidebar/NotesList.svelte`

```svelte
<!-- src/lib/components/sidebar/NotesList.svelte -->
<script lang="ts">
	import type { Note } from '$lib/types/note';
	import { notes as noteStore } from '$lib/stores/note.store';
	import { tick } from 'svelte';

	let { notes, chatId }: { notes: Note[]; chatId: string } = $props();

	let editingNoteId = $state<string | null>(null);
	let editContent = $state('');
	let showNewNoteForm = $state(false);
	let newNoteContent = $state('');
	let newNoteType = $state<'SCRATCH' | 'SUMMARY' | 'TODO'>('SCRATCH');

	async function startEdit(note: Note) {
		editingNoteId = note.id;
		editContent = note.content;
		await tick();
		// Focus textarea
	}

	function cancelEdit() {
		editingNoteId = null;
		editContent = '';
	}

	async function saveEdit(noteId: string) {
		await noteStore.update(noteId, { content: editContent });
		editingNoteId = null;
		editContent = '';
	}

	async function createNote() {
		if (!newNoteContent.trim()) return;

		await noteStore.create({
			chatId,
			type: newNoteType,
			content: newNoteContent.trim()
		});

		newNoteContent = '';
		showNewNoteForm = false;
	}

	function deleteNote(noteId: string) {
		if (confirm('Delete this note?')) {
			noteStore.delete(noteId);
		}
	}

	const noteTypeIcons = {
		SCRATCH: '📝',
		SUMMARY: '📊',
		TODO: '✅'
	};
</script>

<div class="space-y-4">
	<!-- Add Note Button -->
	<button 
		class="btn btn-primary btn-sm w-full"
		onclick={() => showNewNoteForm = !showNewNoteForm}
	>
		➕ New Note
	</button>

	<!-- New Note Form -->
	{#if showNewNoteForm}
		<div class="card bg-base-200 shadow-sm">
			<div class="card-body p-3">
				<select 
					bind:value={newNoteType}
					class="select select-bordered select-sm w-full mb-2"
				>
					<option value="SCRATCH">📝 Scratch</option>
					<option value="SUMMARY">📊 Summary</option>
					<option value="TODO">✅ Todo</option>
				</select>

				<textarea
					bind:value={newNoteContent}
					class="textarea textarea-bordered w-full"
					placeholder="Note content..."
					rows="3"
				></textarea>

				<div class="flex gap-2 mt-2">
					<button 
						class="btn btn-primary btn-sm flex-1"
						onclick={createNote}
					>
						Save
					</button>
					<button 
						class="btn btn-ghost btn-sm"
						onclick={() => {
							showNewNoteForm = false;
							newNoteContent = '';
						}}
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Notes List -->
	{#if notes.length === 0}
		<div class="text-center text-base-content/50">
			<p class="text-sm">No notes yet</p>
		</div>
	{:else}
		{#each notes as note (note.id)}
			<div class="card bg-base-200 shadow-sm">
				<div class="card-body p-3">
					<!-- Note Type Badge -->
					<div class="flex items-center justify-between mb-2">
						<span class="badge badge-sm">
							{noteTypeIcons[note.type]} {note.type}
						</span>
						<span class="text-xs text-base-content/50">
							{new Date(note.createdAt).toLocaleDateString()}
						</span>
					</div>

					<!-- Note Content -->
					{#if editingNoteId === note.id}
						<textarea
							bind:value={editContent}
							class="textarea textarea-bordered w-full"
							rows="3"
						></textarea>
						<div class="flex gap-2 mt-2">
							<button 
								class="btn btn-primary btn-xs"
								onclick={() => saveEdit(note.id)}
							>
								Save
							</button>
							<button 
								class="btn btn-ghost btn-xs"
								onclick={cancelEdit}
							>
								Cancel
							</button>
						</div>
					{:else}
						<p class="text-sm whitespace-pre-wrap">{note.content}</p>

						<!-- Actions -->
						<div class="card-actions justify-end mt-2">
							<button 
								class="btn btn-ghost btn-xs"
								onclick={() => startEdit(note)}
							>
								✏️ Edit
							</button>
							<button 
								class="btn btn-ghost btn-xs"
								onclick={() => deleteNote(note.id)}
							>
								🗑️ Delete
							</button>
						</div>
					{/if}

					<!-- Tags -->
					{#if note.tags.length > 0}
						<div class="flex flex-wrap gap-1 mt-2">
							{#each note.tags as tag}
								<span class="badge badge-sm" style="background-color: {tag.color}33;">
									#{tag.name}
								</span>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		{/each}
	{/if}
</div>
```

**Integration Point:** SecondaryPanel

---

### Step 6.4: Enhance MessageItem with Text Selection

**File:** `src/lib/components/chat/MessageItem.svelte`

```svelte
<!-- src/lib/components/chat/MessageItem.svelte -->
<script lang="ts">
	import type { Message, Highlight } from '$lib/types/chat';
	import { highlights as highlightStore } from '$lib/stores/highlight.store';
	import { toast } from '$lib/stores/toast.store';

	let { message }: { message: Message } = $props();

	let selectedText = $state('');
	let selectionRange = $state<{ start: number; end: number } | null>(null);
	let showHighlightMenu = $state(false);
	let menuPosition = $state({ x: 0, y: 0 });

	function handleTextSelection() {
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return;

		const range = selection.getRangeAt(0);
		const text = selection.toString().trim();

		if (!text) {
			showHighlightMenu = false;
			return;
		}

		// Get offsets relative to message content
		const messageElement = document.querySelector(`[data-message-id="${message.id}"]`);
		if (!messageElement) return;

		const contentElement = messageElement.querySelector('.message-content');
		if (!contentElement) return;

		// Calculate offsets
		const startOffset = getTextOffset(contentElement, range.startContainer, range.startOffset);
		const endOffset = startOffset + text.length;

		selectedText = text;
		selectionRange = { start: startOffset, end: endOffset };

		// Position menu
		const rect = range.getBoundingClientRect();
		menuPosition = {
			x: rect.left + rect.width / 2,
			y: rect.top - 40
		};

		showHighlightMenu = true;
	}

	function getTextOffset(root: Node, node: Node, offset: number): number {
		// Walk the DOM tree to calculate text offset
		let textOffset = 0;
		const walker = document.createTreeWalker(
			root,
			NodeFilter.SHOW_TEXT,
			null
		);

		let currentNode;
		while ((currentNode = walker.nextNode())) {
			if (currentNode === node) {
				return textOffset + offset;
			}
			textOffset += currentNode.textContent?.length || 0;
		}

		return textOffset;
	}

	async function createHighlight(color: string = '#FFFF00') {
		if (!selectionRange) return;

		await highlightStore.create({
			messageId: message.id,
			text: selectedText,
			startOffset: selectionRange.start,
			endOffset: selectionRange.end,
			color
		});

		showHighlightMenu = false;
		window.getSelection()?.removeAllRanges();
	}

	function renderContentWithHighlights(content: string, highlights: Highlight[]): string {
		if (highlights.length === 0) return content;

		// Sort highlights by startOffset
		const sorted = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

		let result = '';
		let lastIndex = 0;

		for (const highlight of sorted) {
			// Add text before highlight
			result += content.substring(lastIndex, highlight.startOffset);

			// Add highlighted text
			result += `<mark style="background-color: ${highlight.color};">${highlight.text}</mark>`;

			lastIndex = highlight.endOffset;
		}

		// Add remaining text
		result += content.substring(lastIndex);

		return result;
	}
</script>

<div 
	class="chat {message.role === 'user' ? 'chat-start' : 'chat-end'}"
	data-message-id={message.id}
>
	<div class="chat-bubble">
		<div 
			class="message-content"
			onmouseup={handleTextSelection}
		>
			{@html renderContentWithHighlights(message.content, message.highlights)}
		</div>

		<!-- Tags -->
		{#if message.tags.length > 0}
			<div class="flex flex-wrap gap-1 mt-2">
				{#each message.tags as tag}
					<span class="badge badge-xs" style="background-color: {tag.color}33;">
						#{tag.name}
					</span>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Highlight Menu -->
{#if showHighlightMenu}
	<div 
		class="fixed z-50 bg-base-100 shadow-lg rounded-lg border border-base-300 p-2 flex gap-2"
		style="left: {menuPosition.x}px; top: {menuPosition.y}px; transform: translateX(-50%);"
	>
		<button 
			class="btn btn-xs"
			style="background-color: #FFFF00;"
			onclick={() => createHighlight('#FFFF00')}
			title="Yellow"
		>
			🟡
		</button>
		<button 
			class="btn btn-xs"
			style="background-color: #00FF00;"
			onclick={() => createHighlight('#00FF00')}
			title="Green"
		>
			🟢
		</button>
		<button 
			class="btn btn-xs"
			style="background-color: #FF6B6B;"
			onclick={() => createHighlight('#FF6B6B')}
			title="Red"
		>
			🔴
		</button>
		<button 
			class="btn btn-xs btn-ghost"
			onclick={() => showHighlightMenu = false}
		>
			✕
		</button>
	</div>
{/if}

<style>
	mark {
		padding: 2px 0;
		border-radius: 2px;
	}

	.message-content {
		user-select: text;
		cursor: text;
	}
</style>
```

**Integration Point:** ChatView

---

### Step 6.5: Update +layout.svelte

**File:** `src/routes/+layout.svelte`

**Action:** Add SecondaryPanel to layout

```svelte
<script lang="ts">
	import '../app.css';
	import Header from '$lib/components/layout/Header.svelte';
	import Main from '$lib/components/layout/Main.svelte';
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import SecondaryPanel from '$lib/components/layout/SecondaryPanel.svelte'; // NEW
	import Menu from '$lib/components/menu/Menu.svelte';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';
	import ToastContainer from '$lib/components/ui/ToastContainer.svelte';
	import { hideSideMenu, showSecondaryPanel } from '$lib/stores/ui.store'; // NEW
	// ... existing imports

	let { children, data } = $props();

	// ... existing code
</script>

<!-- ... svelte:head -->

<ToastContainer position="top-right" />

<ErrorBoundary>
<div class="w-full h-screen flex justify-center bg-base-300" style="padding: var(--layout-container-padding)">
	<div
		class="w-full h-full grid shadow-xl rounded-md overflow-hidden"
		style:max-width="var(--layout-app-max-width)"
		style:grid-template-areas={`
			"sidebar header secondary"
			"sidebar content secondary"
		`}
		style:grid-template-rows="var(--layout-header-height) 1fr"
		style:grid-template-columns="auto 1fr auto"
	>
		<Sidebar isVisible={!$hideSideMenu}>
			<ErrorBoundary showToast={false} logErrors={true}>
				<Menu />
			</ErrorBoundary>
		</Sidebar>

		<Header>
			<div class="text-base-content/50">Header Content</div>
		</Header>

		<Main>
			<ErrorBoundary>
				{@render children()}
			</ErrorBoundary>
		</Main>

		<!-- NEW: Secondary Panel -->
		{#if $showSecondaryPanel}
			<SecondaryPanel />
		{/if}
	</div>
</div>
</ErrorBoundary>
```

**Integration Point:** All pages

---

## Phase 7: UI Components - Attachments & Tags

### Step 7.1: Create AttachmentsList Component

**File:** `src/lib/components/sidebar/AttachmentsList.svelte`

```svelte
<!-- Similar pattern to NotesList.svelte -->
<!-- File upload, URL attachment, display list -->
```

**Integration Point:** SecondaryPanel

---

### Step 7.2: Create TagManager Component

**File:** `src/lib/components/sidebar/TagManager.svelte`

```svelte
<!-- Tag creation, color picker, assignment to items -->
```

**Integration Point:** Various components (ChatHistory, MessageItem, NotesList)

---

## Phase 8: Search Implementation

### Step 8.1: Create SearchPanel Component

**File:** `src/lib/components/menu/SearchPanel.svelte`

```svelte
<!-- src/lib/components/menu/SearchPanel.svelte -->
<script lang="ts">
	import { search as searchStore } from '$lib/stores/search.store';
	import type { SearchQuery } from '$lib/types/search';

	let query = $state('');
	let mode = $state<'text' | 'semantic' | 'hybrid'>('text');
	let isSearching = $state(false);

	async function handleSearch() {
		if (!query.trim()) return;

		isSearching = true;

		const searchQuery: SearchQuery = {
			query: query.trim(),
			mode,
			pagination: { page: 0, limit: 20 }
		};

		await searchStore.search(searchQuery);
		isSearching = false;
	}

	const results = $derived($searchStore.results);
</script>

<div class="space-y-4 p-4">
	<!-- Search Input -->
	<div class="form-control">
		<div class="input-group">
			<input
				type="text"
				bind:value={query}
				placeholder="Search chats, messages, notes..."
				class="input input-bordered w-full"
				onkeydown={(e) => {
					if (e.key === 'Enter') handleSearch();
				}}
			/>
			<button 
				class="btn btn-primary"
				onclick={handleSearch}
				disabled={isSearching}
			>
				{#if isSearching}
					<span class="loading loading-spinner loading-sm"></span>
				{:else}
					🔍
				{/if}
			</button>
		</div>
	</div>

	<!-- Search Mode -->
	<div class="flex gap-2">
		<button 
			class="btn btn-sm {mode === 'text' ? 'btn-primary' : 'btn-ghost'}"
			onclick={() => mode = 'text'}
		>
			Text
		</button>
		<button 
			class="btn btn-sm {mode === 'semantic' ? 'btn-primary' : 'btn-ghost'}"
			onclick={() => mode = 'semantic'}
		>
			Semantic
		</button>
		<button 
			class="btn btn-sm {mode === 'hybrid' ? 'btn-primary' : 'btn-ghost'}"
			onclick={() => mode = 'hybrid'}
		>
			Hybrid
		</button>
	</div>

	<!-- Results -->
	<div class="space-y-2">
		{#if results.length === 0 && !isSearching}
			<p class="text-center text-base-content/50 text-sm">
				No results
			</p>
		{:else}
			{#each results as result (result.id)}
				<div class="card bg-base-200 shadow-sm">
					<div class="card-body p-3">
						<h3 class="card-title text-sm">{result.chatTitle}</h3>
						<p class="text-xs text-base-content/70">
							{result.snippet}
						</p>
						<div class="text-xs text-base-content/50">
							Score: {result.score.toFixed(2)}
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
```

**Integration Point:** Menu component

---

## Phase 9: References System

### Step 9.1: Enhanced MessageComposer with References

(See architecture document for complete implementation)

**File:** `src/lib/components/layout/MessageComposer.svelte`

**Key Features:**
- Reference picker (@-mention style)
- Context building from chats/folders
- Display reference chips
- Remove references

**Integration Point:** Main layout

---

## Phase 10: Integration & Testing

### Step 10.1: End-to-End Testing Checklist

```typescript
// Manual testing checklist

✅ Create chat
✅ Send message
✅ Receive AI response
✅ Create note
✅ Edit note
✅ Delete note
✅ Select text and create highlight
✅ View highlights in sidebar
✅ Delete highlight
✅ Upload file attachment
✅ Add URL attachment
✅ Create tag
✅ Assign tag to chat
✅ Search (text mode)
✅ Search (semantic mode - once implemented)
✅ Add reference to prompt
✅ View context from reference
✅ Create folder
✅ Move chat to folder
✅ Nested folders
```

---

### Step 10.2: Integration Points Validation

See [Integration Checkpoints](#integration-checkpoints) section below.

---

## Phase 11: Polish & Optimization

### Step 11.1: Performance Optimization

- Add database query optimization
- Implement pagination for large lists
- Add virtual scrolling for messages
- Cache frequently accessed data
- Optimize bundle size

### Step 11.2: UI/UX Polish

- Loading states
- Empty states
- Error messages
- Keyboard shortcuts
- Accessibility (ARIA labels)

### Step 11.3: Documentation

- API documentation
- Component documentation
- Setup guide
- Deployment guide

---

## Integration Checkpoints

### Checkpoint 1: Database Layer ✓

**Validate:**
```bash
pnpm db:push
pnpm db:studio # Verify tables exist
```

**Test Query:**
```typescript
const chats = await db.query.chats.findMany();
console.log('Chats:', chats);
```

---

### Checkpoint 2: Repository Layer ✓

**Validate:**
```typescript
import { chatRepository } from '$lib/server/repositories/chat.repository';

const chat = await chatRepository.create({
  userId: 1,
  title: 'Test',
  config: { /* ... */ }
});
console.log('Created:', chat);
```

---

### Checkpoint 3: Service Layer ✓

**Validate:**
```typescript
import { chatService } from '$lib/server/services/chat.service';

const chat = await chatService.createChat(1, {
  title: 'Service Test',
  config: { /* ... */ }
});
console.log('Service created:', chat);
```

---

### Checkpoint 4: API Endpoints ✓

**Validate:**
```bash
# Test with curl or Postman
curl -X POST http://localhost:5173/api/chats \
  -H "Content-Type: application/json" \
  -d '{"title":"API Test","config":{...}}'
```

---

### Checkpoint 5: Frontend Stores ✓

**Validate:**
```typescript
import { notes } from '$lib/stores/note.store';

await notes.loadByChatId('chat-123');
console.log('Loaded notes:', get(notes));
```

---

### Checkpoint 6: UI Components ✓

**Validate:**
- Visual inspection
- Interactive testing
- Responsive design check
- Browser console for errors

---

### Checkpoint 7: End-to-End Flow ✓

**Validate:**
1. Create chat → see in sidebar
2. Send message → see in chat view
3. Create note → see in secondary panel
4. Create highlight → see in secondary panel
5. Search → find results
6. Add reference → see in composer

---

## Validation Matrix

| Component | Unit Test | Integration Test | E2E Test | Status |
|-----------|-----------|------------------|----------|--------|
| Database Schema | ✅ | ✅ | - | ⏳ |
| ChatRepository | ✅ | ✅ | - | ⏳ |
| NoteRepository | ✅ | ✅ | - | ⏳ |
| HighlightRepository | ✅ | ✅ | - | ⏳ |
| ChatService | ✅ | ✅ | - | ⏳ |
| SearchService | ✅ | ✅ | - | ⏳ |
| API: /api/chats | - | ✅ | ✅ | ⏳ |
| API: /api/notes | - | ✅ | ✅ | ⏳ |
| API: /api/highlights | - | ✅ | ✅ | ⏳ |
| API: /api/search | - | ✅ | ✅ | ⏳ |
| note.store | ✅ | - | - | ⏳ |
| highlight.store | ✅ | - | - | ⏳ |
| SecondaryPanel | - | - | ✅ | ⏳ |
| MessageItem | - | - | ✅ | ⏳ |
| SearchPanel | - | - | ✅ | ⏳ |
| Full User Flow | - | - | ✅ | ⏳ |

---

## Summary

This implementation plan provides:

✅ **Clear step-by-step instructions** for each component  
✅ **Integration points** at every layer  
✅ **Validation checkpoints** to ensure correctness  
✅ **Code examples** for critical components  
✅ **Testing strategy** for quality assurance  
✅ **Incremental approach** to minimize risk  

**Estimated Timeline:**
- Phase 1-2: 2-3 days (Database + Repositories)
- Phase 3-4: 2-3 days (Services + API)
- Phase 5-6: 3-4 days (Stores + UI for Notes/Highlights)
- Phase 7: 2 days (Attachments + Tags)
- Phase 8: 2 days (Search)
- Phase 9: 2 days (References)
- Phase 10-11: 2-3 days (Testing + Polish)

**Total: ~15-20 days** for complete implementation

---

**Next Action:** Begin with Phase 1, Step 1.1 - Update Database Schema

**AI Agent Instructions:**
1. Start with Phase 1, complete all steps
2. Validate at each checkpoint
3. Move to next phase only after validation
4. Log all integration points
5. Report any blockers immediately

---

*Document Version: 1.0*  
*Last Updated: 2025-01-03*
