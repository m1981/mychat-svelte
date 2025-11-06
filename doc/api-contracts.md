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
