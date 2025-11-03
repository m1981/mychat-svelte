# 🔌 API Contracts Documentation

**Project:** Enhanced ChatGPT Clone with Content Management  
**Version:** 1.0.0  
**Date:** 2025-01-03  

This document defines all API contracts between frontend, backend, and database layers to ensure interface compatibility and architectural soundness.

---

## 📋 Table of Contents

1. [REST API Endpoints](#rest-api-endpoints)
2. [WebSocket Streams](#websocket-streams)
3. [TypeScript Interfaces](#typescript-interfaces)
4. [Repository Contracts](#repository-contracts)
5. [Service Contracts](#service-contracts)
6. [Database Schema Contracts](#database-schema-contracts)
7. [Event Contracts](#event-contracts)
8. [Validation Rules](#validation-rules)

---

## 1. REST API Endpoints

### 1.1 Chat Management

#### `POST /api/chats`
Create a new chat.

**Request:**
```typescript
{
  title?: string;           // Optional, defaults to "New Chat"
  folderId?: string;        // Optional folder assignment
  config: {
    provider: 'openai' | 'anthropic';
    modelConfig: {
      model: string;
      max_tokens: number;
      temperature: number;
      top_p: number;
      presence_penalty: number;
      frequency_penalty: number;
    }
  };
  tags?: string[];          // Optional tag names
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  title: string;
  folderId?: string;
  config: ChatConfig;
  tags: Tag[];
  metadata: {
    tokenCount: 0;
    embedding: null;
  };
  createdAt: string;        // ISO 8601
  updatedAt: string;        // ISO 8601
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input
- `401 Unauthorized` - Not authenticated
- `429 Too Many Requests` - Rate limit exceeded

---

#### `GET /api/chats`
List all chats for authenticated user with pagination.

**Query Parameters:**
```typescript
{
  page?: number;            // Default: 0
  limit?: number;           // Default: 50, Max: 100
  folderId?: string;        // Filter by folder
  tags?: string[];          // Filter by tags (comma-separated)
  search?: string;          // Text search
  sortBy?: 'createdAt' | 'updatedAt' | 'title';  // Default: 'updatedAt'
  sortOrder?: 'asc' | 'desc';  // Default: 'desc'
}
```

**Response (200 OK):**
```typescript
{
  data: Chat[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}
```

---

#### `GET /api/chats/:chatId`
Get a single chat with full message history.

**Response (200 OK):**
```typescript
{
  id: string;
  title: string;
  folderId?: string;
  messages: Message[];
  config: ChatConfig;
  tags: Tag[];
  metadata: ChatMetadata;
  createdAt: string;
  updatedAt: string;
}
```

**Error Responses:**
- `404 Not Found` - Chat doesn't exist
- `403 Forbidden` - Not owner of chat

---

#### `PATCH /api/chats/:chatId`
Update chat metadata (title, folder, tags).

**Request:**
```typescript
{
  title?: string;
  folderId?: string | null;  // null to remove from folder
  tags?: string[];           // Replaces existing tags
}
```

**Response (200 OK):**
```typescript
{
  id: string;
  title: string;
  folderId?: string;
  tags: Tag[];
  updatedAt: string;
}
```

---

#### `DELETE /api/chats/:chatId`
Soft delete a chat (can be recovered).

**Response (204 No Content)**

**Error Responses:**
- `404 Not Found` - Chat doesn't exist
- `403 Forbidden` - Not owner of chat

---

#### `POST /api/chats/:chatId/generate`
Generate AI response for a chat (streaming).

**Request:**
```typescript
{
  message: string;          // User's message
  references?: Reference[]; // Optional context references
  config?: {                // Optional config override
    temperature?: number;
    max_tokens?: number;
  };
}
```

**Response (200 OK - Server-Sent Events):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"type":"start","messageId":"msg_123"}

data: {"type":"chunk","content":"Hello"}

data: {"type":"chunk","content":" there"}

data: {"type":"done","messageId":"msg_123","tokenCount":245}

```

**Event Types:**
```typescript
type StreamEvent = 
  | { type: 'start'; messageId: string }
  | { type: 'chunk'; content: string }
  | { type: 'error'; error: string }
  | { type: 'done'; messageId: string; tokenCount: number };
```

---

### 1.2 Folder Management

#### `POST /api/folders`
Create a new folder.

**Request:**
```typescript
{
  name: string;             // 1-100 characters
  parentId?: string;        // Optional parent folder for nesting
  color?: string;           // Hex color (e.g., "#3b82f6")
  type?: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';  // Default: STANDARD
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  name: string;
  parentId?: string;
  type: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
  expanded: boolean;        // Default: true
  order: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

#### `GET /api/folders`
List all folders with hierarchy.

**Query Parameters:**
```typescript
{
  includeChats?: boolean;   // Default: false - include chat count
  flat?: boolean;           // Default: false - return flat list vs tree
}
```

**Response (200 OK) - Tree Structure:**
```typescript
{
  data: FolderNode[];
}

interface FolderNode {
  id: string;
  name: string;
  parentId?: string;
  type: string;
  expanded: boolean;
  order: number;
  color?: string;
  chatCount?: number;       // If includeChats=true
  children?: FolderNode[];  // If flat=false
}
```

---

#### `PATCH /api/folders/:folderId`
Update folder metadata.

**Request:**
```typescript
{
  name?: string;
  parentId?: string | null; // null to move to root
  color?: string;
  expanded?: boolean;
  order?: number;
}
```

**Response (200 OK):**
```typescript
{
  id: string;
  name: string;
  parentId?: string;
  type: string;
  expanded: boolean;
  order: number;
  color?: string;
  updatedAt: string;
}
```

---

#### `DELETE /api/folders/:folderId`
Delete folder (must be empty or provide cascade option).

**Query Parameters:**
```typescript
{
  cascade?: boolean;        // Default: false - move chats to parent/root
}
```

**Response (204 No Content)**

**Error Responses:**
- `400 Bad Request` - Folder not empty and cascade=false
- `404 Not Found` - Folder doesn't exist

---

### 1.3 Notes Management

#### `POST /api/notes`
Create a note attached to chat or message.

**Request:**
```typescript
{
  chatId: string;           // Required
  messageId?: string;       // Optional - attach to specific message
  type: 'SCRATCH' | 'SUMMARY' | 'TODO';
  content: string;          // 1-10000 characters
  tags?: string[];
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  chatId: string;
  messageId?: string;
  type: 'SCRATCH' | 'SUMMARY' | 'TODO';
  content: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
```

---

#### `GET /api/notes`
List notes with filtering.

**Query Parameters:**
```typescript
{
  chatId?: string;          // Filter by chat
  messageId?: string;       // Filter by message
  type?: 'SCRATCH' | 'SUMMARY' | 'TODO';
  tags?: string[];          // Filter by tags
  limit?: number;           // Default: 50
}
```

**Response (200 OK):**
```typescript
{
  data: Note[];
  total: number;
}
```

---

#### `PATCH /api/notes/:noteId`
Update note content or metadata.

**Request:**
```typescript
{
  content?: string;
  type?: 'SCRATCH' | 'SUMMARY' | 'TODO';
  tags?: string[];
}
```

**Response (200 OK):**
```typescript
{
  id: string;
  content: string;
  type: string;
  tags: Tag[];
  updatedAt: string;
}
```

---

#### `DELETE /api/notes/:noteId`
Delete a note permanently.

**Response (204 No Content)**

---

### 1.4 Highlights Management

#### `POST /api/highlights`
Create a highlight on a message.

**Request:**
```typescript
{
  messageId: string;
  text: string;             // The highlighted text
  startOffset: number;      // Character offset in message content
  endOffset: number;        // Character offset in message content
  color?: string;           // Hex color, default: "#FFFF00"
  note?: string;            // Optional annotation
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  messageId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  color: string;
  note?: string;
  createdAt: string;
}
```

**Validation:**
- `startOffset` < `endOffset`
- `endOffset` <= message content length
- `text` must match `message.content.substring(startOffset, endOffset)`

---

#### `GET /api/highlights`
List highlights with filtering.

**Query Parameters:**
```typescript
{
  chatId?: string;          // Filter by chat
  messageId?: string;       // Filter by message
  color?: string;           // Filter by color
  limit?: number;           // Default: 100
}
```

**Response (200 OK):**
```typescript
{
  data: Highlight[];
  total: number;
}
```

---

#### `PATCH /api/highlights/:highlightId`
Update highlight annotation or color.

**Request:**
```typescript
{
  color?: string;
  note?: string;
}
```

**Response (200 OK):**
```typescript
{
  id: string;
  color: string;
  note?: string;
  updatedAt: string;
}
```

---

#### `DELETE /api/highlights/:highlightId`
Delete a highlight.

**Response (204 No Content)**

---

### 1.5 Attachments Management

#### `POST /api/attachments`
Attach a file or URL to a chat.

**Request (Multipart for files):**
```typescript
FormData {
  chatId: string;
  type: 'FILE' | 'URL' | 'IMAGE';
  file?: File;              // For FILE/IMAGE type
  url?: string;             // For URL type
}
```

**Request (JSON for URLs):**
```typescript
{
  chatId: string;
  type: 'URL';
  url: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  chatId: string;
  type: 'FILE' | 'URL' | 'IMAGE';
  content: string;          // URL or file path
  metadata: {
    filename?: string;
    size?: number;
    mimeType?: string;
    title?: string;
    description?: string;
  };
  createdAt: string;
}
```

**Limits:**
- Max file size: 10MB
- Allowed file types: pdf, docx, txt, png, jpg, gif, webp
- Max 50 attachments per chat

---

#### `GET /api/attachments`
List attachments for a chat.

**Query Parameters:**
```typescript
{
  chatId: string;           // Required
  type?: 'FILE' | 'URL' | 'IMAGE';
}
```

**Response (200 OK):**
```typescript
{
  data: Attachment[];
  total: number;
}
```

---

#### `DELETE /api/attachments/:attachmentId`
Delete an attachment (also deletes file if type=FILE).

**Response (204 No Content)**

---

### 1.6 Tags Management

#### `POST /api/tags`
Create a new tag.

**Request:**
```typescript
{
  name: string;             // 1-50 characters, unique per user
  color?: string;           // Hex color
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
}
```

**Response (201 Created):**
```typescript
{
  id: string;
  name: string;
  color?: string;
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
  createdAt: string;
}
```

---

#### `GET /api/tags`
List all tags for authenticated user.

**Query Parameters:**
```typescript
{
  type?: 'CHAT' | 'MESSAGE' | 'NOTE';
  search?: string;          // Filter by name
}
```

**Response (200 OK):**
```typescript
{
  data: Tag[];
  total: number;
}
```

---

#### `DELETE /api/tags/:tagId`
Delete a tag (also removes from all tagged items).

**Response (204 No Content)**

---

### 1.7 Search API

#### `POST /api/search`
Multi-modal search across chats, messages, notes.

**Request:**
```typescript
{
  query?: string;           // Text search query
  mode: 'text' | 'semantic' | 'hybrid';  // Search mode
  filters?: {
    chatIds?: string[];
    folderIds?: string[];
    tags?: string[];
    dateFrom?: string;      // ISO 8601
    dateTo?: string;        // ISO 8601
    types?: ('chat' | 'message' | 'note')[];
  };
  pagination?: {
    page?: number;          // Default: 0
    limit?: number;         // Default: 20, Max: 100
  };
}
```

**Response (200 OK):**
```typescript
{
  results: SearchResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  took: number;             // Search time in milliseconds
}

interface SearchResult {
  type: 'chat' | 'message' | 'note';
  id: string;
  chatId: string;
  chatTitle: string;
  title?: string;           // For notes
  snippet: string;          // Excerpt with highlight
  content: string;          // Full content
  score: number;            // Relevance score (0-1)
  highlights: string[];     // Matched text segments
  metadata: {
    createdAt: string;
    tags?: Tag[];
    messageRole?: 'user' | 'assistant';
  };
}
```

**Search Modes:**
- `text`: Full-text search using PostgreSQL tsvector
- `semantic`: Vector similarity search using embeddings
- `hybrid`: Combines both with weighted scoring

---

### 1.8 Embeddings API

#### `POST /api/embeddings`
Generate embeddings for text (background job).

**Request:**
```typescript
{
  texts: string[];          // Max 100 texts per request
  type: 'chat' | 'message';
  ids: string[];            // Corresponding IDs
}
```

**Response (202 Accepted):**
```typescript
{
  jobId: string;
  status: 'queued';
  estimatedTime: number;    // Seconds
}
```

---

#### `GET /api/embeddings/:jobId`
Check embedding job status.

**Response (200 OK):**
```typescript
{
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;         // 0-100
  processedCount: number;
  totalCount: number;
  error?: string;
}
```

---

## 2. WebSocket Streams

### 2.1 Chat Generation Stream

**Endpoint:** `ws://api.example.com/ws/chat/:chatId/generate`

**Connection Headers:**
```
Authorization: Bearer <token>
```

**Client → Server Messages:**
```typescript
{
  type: 'start';
  message: string;
  references?: Reference[];
  config?: Partial<ModelConfig>;
}

{
  type: 'stop';             // Stop generation
}
```

**Server → Client Messages:**
```typescript
{
  type: 'connected';
  chatId: string;
}

{
  type: 'start';
  messageId: string;
  timestamp: string;
}

{
  type: 'chunk';
  content: string;
  tokenCount: number;       // Cumulative
}

{
  type: 'done';
  messageId: string;
  totalTokens: number;
  duration: number;         // Milliseconds
}

{
  type: 'error';
  code: string;
  message: string;
}
```

---

## 3. TypeScript Interfaces

### 3.1 Core Domain Types

```typescript
// src/lib/types/chat.ts

export interface Chat {
  id: string;
  userId: number;
  title: string;
  folderId?: string;
  messages: Message[];
  config: ChatConfig;
  tags: Tag[];
  metadata: ChatMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  tags: Tag[];
  highlights: Highlight[];
  embedding?: number[];
  createdAt: Date;
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

export interface ChatMetadata {
  tokenCount?: number;
  embedding?: number[];
  lastMessageAt?: Date;
  messageCount?: number;
}

export interface Folder {
  id: string;
  userId: number;
  name: string;
  parentId?: string;
  type: 'STANDARD' | 'ARCHIVE' | 'FAVORITE';
  expanded: boolean;
  order: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

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

export interface Tag {
  id: string;
  userId: number;
  name: string;
  color?: string;
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
  createdAt: Date;
}

export interface Reference {
  id: string;
  type: 'CHAT' | 'FOLDER' | 'MESSAGE';
  targetId: string;
  title: string;
  metadata?: {
    messageCount?: number;
    lastUpdated?: Date;
  };
}
```

### 3.2 Search Types

```typescript
// src/lib/types/search.ts

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

---

## 4. Repository Contracts

### 4.1 ChatRepository Interface

```typescript
// src/lib/server/repositories/chat.repository.ts

export interface ChatRepository {
  // Basic CRUD
  create(chat: CreateChatDTO): Promise<Chat>;
  findById(id: string, userId: number): Promise<Chat | null>;
  findByUserId(userId: number, options?: FindOptions): Promise<Chat[]>;
  update(id: string, userId: number, updates: UpdateChatDTO): Promise<Chat>;
  delete(id: string, userId: number): Promise<void>;

  // Specialized queries
  findByFolderId(folderId: string, userId: number): Promise<Chat[]>;
  findByTags(tags: string[], userId: number): Promise<Chat[]>;
  search(query: SearchQuery, userId: number): Promise<SearchResult[]>;
  
  // Message operations
  addMessage(chatId: string, message: CreateMessageDTO): Promise<Message>;
  getMessages(chatId: string, options?: MessageQueryOptions): Promise<Message[]>;
  
  // Metadata operations
  updateMetadata(chatId: string, metadata: Partial<ChatMetadata>): Promise<void>;
  incrementTokenCount(chatId: string, count: number): Promise<void>;
}

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
  tags?: string[];
}

export interface FindOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  includeTags?: boolean;
  includeMessages?: boolean;
}

export interface CreateMessageDTO {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tags?: string[];
}

export interface MessageQueryOptions {
  limit?: number;
  offset?: number;
  includeHighlights?: boolean;
  includeTags?: boolean;
}
```

### 4.2 NoteRepository Interface

```typescript
// src/lib/server/repositories/note.repository.ts

export interface NoteRepository {
  create(note: CreateNoteDTO): Promise<Note>;
  findById(id: string, userId: number): Promise<Note | null>;
  findByChatId(chatId: string, userId: number): Promise<Note[]>;
  findByMessageId(messageId: string, userId: number): Promise<Note[]>;
  findByTags(tags: string[], userId: number): Promise<Note[]>;
  update(id: string, userId: number, updates: UpdateNoteDTO): Promise<Note>;
  delete(id: string, userId: number): Promise<void>;
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

### 4.3 HighlightRepository Interface

```typescript
// src/lib/server/repositories/highlight.repository.ts

export interface HighlightRepository {
  create(highlight: CreateHighlightDTO): Promise<Highlight>;
  findById(id: string): Promise<Highlight | null>;
  findByMessageId(messageId: string): Promise<Highlight[]>;
  findByChatId(chatId: string): Promise<Highlight[]>;
  findByColor(color: string, userId: number): Promise<Highlight[]>;
  update(id: string, updates: UpdateHighlightDTO): Promise<Highlight>;
  delete(id: string): Promise<void>;
  
  // Validation
  validateOffsets(messageId: string, startOffset: number, endOffset: number): Promise<boolean>;
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

### 4.4 AttachmentRepository Interface

```typescript
// src/lib/server/repositories/attachment.repository.ts

export interface AttachmentRepository {
  create(attachment: CreateAttachmentDTO): Promise<Attachment>;
  findById(id: string, userId: number): Promise<Attachment | null>;
  findByChatId(chatId: string, userId: number): Promise<Attachment[]>;
  findByType(type: AttachmentType, chatId: string): Promise<Attachment[]>;
  delete(id: string, userId: number): Promise<void>;
  
  // File operations
  uploadFile(file: File, chatId: string): Promise<Attachment>;
  deleteFile(attachmentId: string): Promise<void>;
}

export interface CreateAttachmentDTO {
  chatId: string;
  type: 'FILE' | 'URL' | 'IMAGE';
  content: string;
  metadata?: AttachmentMetadata;
}
```

### 4.5 TagRepository Interface

```typescript
// src/lib/server/repositories/tag.repository.ts

export interface TagRepository {
  create(tag: CreateTagDTO): Promise<Tag>;
  findById(id: string, userId: number): Promise<Tag | null>;
  findByUserId(userId: number, type?: TagType): Promise<Tag[]>;
  findByName(name: string, userId: number): Promise<Tag | null>;
  findOrCreate(name: string, userId: number, type: TagType): Promise<Tag>;
  delete(id: string, userId: number): Promise<void>;
  
  // Tag associations
  tagChat(chatId: string, tagId: string): Promise<void>;
  untagChat(chatId: string, tagId: string): Promise<void>;
  tagMessage(messageId: string, tagId: string): Promise<void>;
  untagMessage(messageId: string, tagId: string): Promise<void>;
  tagNote(noteId: string, tagId: string): Promise<void>;
  untagNote(noteId: string, tagId: string): Promise<void>;
}

export interface CreateTagDTO {
  userId: number;
  name: string;
  color?: string;
  type: 'CHAT' | 'MESSAGE' | 'NOTE';
}
```

---

## 5. Service Contracts

### 5.1 ChatService Interface

```typescript
// src/lib/server/services/chat.service.ts

export interface ChatService {
  // Core operations
  createChat(userId: number, data: CreateChatDTO): Promise<Chat>;
  getChat(chatId: string, userId: number): Promise<Chat>;
  updateChat(chatId: string, userId: number, updates: UpdateChatDTO): Promise<Chat>;
  deleteChat(chatId: string, userId: number): Promise<void>;
  
  // Message generation
  generateResponse(
    chatId: string,
    userMessage: string,
    references: Reference[],
    config?: Partial<ModelConfig>
  ): Promise<ReadableStream>;
  
  // Context building
  buildContextFromReferences(references: Reference[]): Promise<string>;
  
  // Metadata management
  updateChatMetadata(chatId: string, metadata: Partial<ChatMetadata>): Promise<void>;
}
```

### 5.2 SearchService Interface

```typescript
// src/lib/server/services/search.service.ts

export interface SearchService {
  // Multi-modal search
  search(query: SearchQuery, userId: number): Promise<SearchResponse>;
  
  // Specialized searches
  textSearch(text: string, userId: number, filters?: SearchFilters): Promise<SearchResult[]>;
  semanticSearch(text: string, userId: number, filters?: SearchFilters): Promise<SearchResult[]>;
  hybridSearch(text: string, userId: number, filters?: SearchFilters): Promise<SearchResult[]>;
  
  // Tag search
  searchByTags(tags: string[], userId: number): Promise<SearchResult[]>;
  
  // Helper methods
  highlightMatches(content: string, query: string): string;
  createSnippet(content: string, query: string, contextLength?: number): string;
  calculateRelevanceScore(result: any, query: string): number;
}
```

### 5.3 EmbeddingService Interface

```typescript
// src/lib/server/services/embedding.service.ts

export interface EmbeddingService {
  // Generate embeddings
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
  
  // Batch operations
  batchGenerateForChats(chatIds: string[]): Promise<void>;
  batchGenerateForMessages(messageIds: string[]): Promise<void>;
  
  // Vector search
  findSimilar(embedding: number[], limit?: number): Promise<SimilarityResult[]>;
  
  // Job management
  createEmbeddingJob(texts: string[], type: 'chat' | 'message', ids: string[]): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
}

export interface SimilarityResult {
  id: string;
  type: 'chat' | 'message';
  content: string;
  similarity: number;
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  processedCount: number;
  totalCount: number;
  error?: string;
}
```

### 5.4 NoteService Interface

```typescript
// src/lib/server/services/note.service.ts

export interface NoteService {
  createNote(userId: number, data: CreateNoteDTO): Promise<Note>;
  getNote(noteId: string, userId: number): Promise<Note>;
  getNotesByChat(chatId: string, userId: number): Promise<Note[]>;
  getNotesByMessage(messageId: string, userId: number): Promise<Note[]>;
  updateNote(noteId: string, userId: number, updates: UpdateNoteDTO): Promise<Note>;
  deleteNote(noteId: string, userId: number): Promise<void>;
  
  // AI-assisted note generation
  generateSummary(chatId: string): Promise<Note>;
  extractKeyPoints(messageId: string): Promise<Note>;
}
```

### 5.5 HighlightService Interface

```typescript
// src/lib/server/services/highlight.service.ts

export interface HighlightService {
  createHighlight(data: CreateHighlightDTO): Promise<Highlight>;
  getHighlight(highlightId: string): Promise<Highlight>;
  getHighlightsByMessage(messageId: string): Promise<Highlight[]>;
  getHighlightsByChat(chatId: string): Promise<Highlight[]>;
  updateHighlight(highlightId: string, updates: UpdateHighlightDTO): Promise<Highlight>;
  deleteHighlight(highlightId: string): Promise<void>;
  
  // Validation
  validateHighlight(messageId: string, startOffset: number, endOffset: number, text: string): Promise<boolean>;
}
```

---

## 6. Database Schema Contracts

### 6.1 Table Structures

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Folders table
CREATE TABLE folders (
  id VARCHAR(32) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name VARCHAR(100) NOT NULL,
  parent_id VARCHAR(32) REFERENCES folders(id),
  type VARCHAR(20) DEFAULT 'STANDARD' NOT NULL,
  expanded BOOLEAN DEFAULT true,
  "order" INTEGER DEFAULT 0,
  color VARCHAR(7),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_folders_user_id ON folders(user_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);

-- Chats table
CREATE TABLE chats (
  id VARCHAR(32) PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  folder_id VARCHAR(32) REFERENCES folders(id),
  title VARCHAR(100) NOT NULL,
  config JSONB NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_folder_id ON chats(folder_id);
CREATE INDEX idx_chats_embedding ON chats USING hnsw (embedding vector_cosine_ops);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id VARCHAR(32) REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  role VARCHAR(16) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_embedding ON messages USING hnsw (embedding vector_cosine_ops);

-- Notes table
CREATE TABLE notes (
  id VARCHAR(32) PRIMARY KEY,
  chat_id VARCHAR(32) REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  type VARCHAR(20) DEFAULT 'SCRATCH' NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notes_chat_id ON notes(chat_id);
CREATE INDEX idx_notes_message_id ON notes(message_id);

-- Highlights table
CREATE TABLE highlights (
  id VARCHAR(32) PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#FFFF00',
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CHECK (start_offset < end_offset)
);

CREATE INDEX idx_highlights_message_id ON highlights(message_id);

-- Attachments table
CREATE TABLE attachments (
  id VARCHAR(32) PRIMARY KEY,
  chat_id VARCHAR(32) REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('FILE', 'URL', 'IMAGE')),
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_attachments_chat_id ON attachments(chat_id);

-- Tags table
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7),
  type VARCHAR(20) NOT NULL CHECK (type IN ('CHAT', 'MESSAGE', 'NOTE')),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, name, type)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(name);

-- Junction tables
CREATE TABLE chat_tags (
  chat_id VARCHAR(32) REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (chat_id, tag_id)
);

CREATE TABLE message_tags (
  message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (message_id, tag_id)
);

CREATE TABLE note_tags (
  note_id VARCHAR(32) REFERENCES notes(id) ON DELETE CASCADE NOT NULL,
  tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  PRIMARY KEY (note_id, tag_id)
);
```

### 6.2 Database Queries - Repository Methods

```typescript
// Example: ChatRepository.findById implementation
async findById(id: string, userId: number): Promise<Chat | null> {
  const result = await db.query.chats.findFirst({
    where: and(
      eq(chats.id, id),
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
      notes: {
        with: {
          noteTags: {
            with: { tag: true }
          }
        }
      },
      attachments: true
    }
  });

  return result ? this.toDomain(result) : null;
}

// Example: SearchService.semanticSearch implementation
async semanticSearch(text: string, userId: number): Promise<SearchResult[]> {
  const embedding = await this.embeddingService.generateEmbedding(text);

  const results = await db.execute(sql`
    SELECT 
      c.id as chat_id,
      c.title as chat_title,
      m.id as message_id,
      m.content as message_content,
      m.role as message_role,
      1 - (m.embedding <=> ${embedding}::vector) as similarity
    FROM chats c
    LEFT JOIN messages m ON m.chat_id = c.id
    WHERE c.user_id = ${userId}
      AND m.embedding IS NOT NULL
    ORDER BY m.embedding <=> ${embedding}::vector
    LIMIT 20
  `);

  return results.rows.map(row => this.mapToSearchResult(row));
}
```

---

## 7. Event Contracts

### 7.1 Client-Side Events (Svelte Stores)

```typescript
// Store update events
export interface ChatStoreEvents {
  'chat:created': { chat: Chat };
  'chat:updated': { chatId: string; updates: Partial<Chat> };
  'chat:deleted': { chatId: string };
  'message:added': { chatId: string; message: Message };
  'message:updated': { messageId: string; updates: Partial<Message> };
}

export interface NoteStoreEvents {
  'note:created': { note: Note };
  'note:updated': { noteId: string; updates: Partial<Note> };
  'note:deleted': { noteId: string };
}

export interface HighlightStoreEvents {
  'highlight:created': { highlight: Highlight };
  'highlight:updated': { highlightId: string; updates: Partial<Highlight> };
  'highlight:deleted': { highlightId: string };
}

export interface SearchStoreEvents {
  'search:started': { query: SearchQuery };
  'search:completed': { results: SearchResult[]; took: number };
  'search:failed': { error: Error };
}
```

### 7.2 Server-Side Events (Streaming)

```typescript
export type ServerEvent =
  | ChatGenerationEvent
  | EmbeddingEvent
  | SystemEvent;

export type ChatGenerationEvent =
  | { type: 'generation:start'; messageId: string; timestamp: string }
  | { type: 'generation:chunk'; content: string; tokenCount: number }
  | { type: 'generation:done'; messageId: string; totalTokens: number; duration: number }
  | { type: 'generation:error'; error: string; code: string };

export type EmbeddingEvent =
  | { type: 'embedding:queued'; jobId: string; itemCount: number }
  | { type: 'embedding:progress'; jobId: string; progress: number }
  | { type: 'embedding:completed'; jobId: string; itemCount: number }
  | { type: 'embedding:failed'; jobId: string; error: string };

export type SystemEvent =
  | { type: 'system:maintenance'; message: string; scheduledFor: string }
  | { type: 'system:quota'; remaining: number; resetAt: string };
```

---

## 8. Validation Rules

### 8.1 Input Validation

```typescript
export const ValidationRules = {
  chat: {
    title: {
      minLength: 1,
      maxLength: 100,
      pattern: /^[^<>{}]*$/  // No HTML tags
    },
    config: {
      temperature: { min: 0, max: 2 },
      max_tokens: { min: 1, max: 32000 },
      top_p: { min: 0, max: 1 }
    }
  },
  
  folder: {
    name: {
      minLength: 1,
      maxLength: 100,
      pattern: /^[^<>{}]*$/
    },
    color: {
      pattern: /^#[0-9A-Fa-f]{6}$/
    },
    maxDepth: 5  // Maximum folder nesting level
  },
  
  message: {
    content: {
      minLength: 1,
      maxLength: 50000
    }
  },
  
  note: {
    content: {
      minLength: 1,
      maxLength: 10000
    }
  },
  
  highlight: {
    text: {
      minLength: 1,
      maxLength: 1000
    },
    note: {
      maxLength: 500
    }
  },
  
  tag: {
    name: {
      minLength: 1,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9_-]+$/  // Alphanumeric, underscore, hyphen
    }
  },
  
  attachment: {
    file: {
      maxSize: 10 * 1024 * 1024,  // 10MB
      allowedTypes: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp'
      ]
    },
    url: {
      maxLength: 2000,
      pattern: /^https?:\/\/.+/
    }
  },
  
  search: {
    query: {
      minLength: 1,
      maxLength: 500
    },
    limit: {
      min: 1,
      max: 100,
      default: 20
    }
  }
};
```

### 8.2 Business Rules

```typescript
export const BusinessRules = {
  chat: {
    maxChatsPerUser: 1000,
    maxMessagesPerChat: 10000,
    maxTokensPerMessage: 32000
  },
  
  folder: {
    maxFoldersPerUser: 100,
    maxDepth: 5,
    maxChatsPerFolder: 500
  },
  
  note: {
    maxNotesPerChat: 50,
    maxNotesPerUser: 1000
  },
  
  highlight: {
    maxHighlightsPerMessage: 20,
    maxHighlightsPerChat: 200
  },
  
  attachment: {
    maxAttachmentsPerChat: 50,
    maxTotalSizePerUser: 1024 * 1024 * 1024  // 1GB
  },
  
  tag: {
    maxTagsPerItem: 10,
    maxTagsPerUser: 100
  },
  
  search: {
    maxResults: 100,
    minQueryLength: 1,
    cacheTimeout: 300  // 5 minutes
  },
  
  embedding: {
    maxBatchSize: 100,
    rateLimit: 100,  // Per minute
    retryAttempts: 3
  },
  
  rateLimits: {
    chatGeneration: { max: 100, window: 3600000 },  // 100 per hour
    search: { max: 1000, window: 3600000 },         // 1000 per hour
    embeddings: { max: 100, window: 60000 }         // 100 per minute
  }
};
```

---

## 9. Error Codes

```typescript
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  REQUIRED_FIELD = 'REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Business Logic
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  
  // External Services
  AI_PROVIDER_ERROR = 'AI_PROVIDER_ERROR',
  EMBEDDING_SERVICE_ERROR = 'EMBEDDING_SERVICE_ERROR',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  requestId?: string;
}
```

---

## 10. Contract Compliance Matrix

| Layer | Component | Validated | Notes |
|-------|-----------|-----------|-------|
| **API** | Chat endpoints | ✅ | All CRUD + generate |
| **API** | Folder endpoints | ✅ | Hierarchy support |
| **API** | Notes endpoints | ✅ | Full CRUD |
| **API** | Highlights endpoints | ✅ | Validation included |
| **API** | Attachments endpoints | ✅ | File upload support |
| **API** | Tags endpoints | ✅ | M:N relationships |
| **API** | Search endpoint | ✅ | Multi-modal search |
| **API** | Embeddings endpoint | ✅ | Async job queue |
| **Types** | Domain models | ✅ | Complete coverage |
| **Types** | DTOs | ✅ | Input/output validation |
| **Repositories** | Interfaces | ✅ | Consistent patterns |
| **Services** | Business logic | ✅ | Clear separation |
| **Database** | Schema | ✅ | Normalized, indexed |
| **Database** | Migrations | ⏳ | To be implemented |
| **Validation** | Rules | ✅ | Comprehensive |
| **Events** | Contracts | ✅ | Type-safe |

---

## 11. Integration Test Scenarios

### 11.1 End-to-End Flow: Create Chat with References

```typescript
test('E2E: Create chat, add messages, highlight, search', async () => {
  // 1. Create chat
  const chat = await api.post('/api/chats', {
    title: 'Test Chat',
    config: defaultConfig
  });
  expect(chat.id).toBeDefined();

  // 2. Add user message
  const userMsg = await api.post(`/api/chats/${chat.id}/messages`, {
    content: 'What is TypeScript?'
  });

  // 3. Generate AI response
  const stream = await api.post(`/api/chats/${chat.id}/generate`, {
    message: userMsg.content
  });
  const response = await consumeStream(stream);
  expect(response.messageId).toBeDefined();

  // 4. Create highlight
  const highlight = await api.post('/api/highlights', {
    messageId: response.messageId,
    text: 'TypeScript is',
    startOffset: 0,
    endOffset: 14,
    color: '#FFFF00'
  });
  expect(highlight.id).toBeDefined();

  // 5. Add note
  const note = await api.post('/api/notes', {
    chatId: chat.id,
    messageId: response.messageId,
    type: 'SUMMARY',
    content: 'Key point: TypeScript adds static typing to JavaScript'
  });
  expect(note.id).toBeDefined();

  // 6. Search for content
  const searchResults = await api.post('/api/search', {
    query: 'TypeScript',
    mode: 'text'
  });
  expect(searchResults.results.length).toBeGreaterThan(0);
  expect(searchResults.results[0].chatId).toBe(chat.id);
});
```

---

## 12. Version Compatibility

| Component | Version | Compatibility |
|-----------|---------|---------------|
| SvelteKit | 2.22.0 | ✅ Full support |
| Svelte | 5.0.0 | ✅ Full support |
| Drizzle ORM | 0.40.0 | ✅ Full support |
| PostgreSQL | 14+ | ✅ Required for pgvector |
| pgvector | 0.5.0+ | ✅ Required for embeddings |
| TypeScript | 5.0+ | ✅ Required for types |
| Node.js | 18+ | ✅ Required for fetch API |

---

## Summary

✅ **Architecture Validation Results:**

1. **Interface Compatibility:** All layers communicate through well-defined contracts
2. **Type Safety:** Complete TypeScript coverage from client to database
3. **Scalability:** Pagination, indexing, and caching strategies defined
4. **Maintainability:** Clear separation of concerns across layers
5. **Testability:** Mockable interfaces at every layer
6. **Extensibility:** Easy to add new features without breaking existing code

**The architecture is sound and ready for implementation.**

---

**Next Steps:**
1. Implement repository layer
2. Implement service layer
3. Create API endpoints
4. Build UI components
5. Write integration tests

---

*Document maintained by: Architecture Team*  
*Last updated: 2025-01-03*
