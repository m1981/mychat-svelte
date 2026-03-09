**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** Functional & Technical Specifications
**Version:** 1.4 (Current-state aligned — 2026-03-09)

---

## 3. Functional Requirements

### 3.1. User Stories with Acceptance Criteria

**Epic 1: Core Chat & AI Interaction (P0)**
*   **Implemented:** Users can send messages, see assistant text stream in real time, auto-scroll to the latest content, and stop generation mid-stream.
*   **Implemented:** After the first assistant response completes, the chat title is auto-generated as a short summary.

**Epic 2: Composer & Rich Content (P1)**
*   **Implemented:** Assistant markdown renders with syntax highlighting and code-block copy buttons.
*   **Implemented:** Dragging a `.txt` or `.md` file into the composer reads the file locally and appends its contents to the textarea.
*   **Implemented:** `Enter` submits, `Shift + Enter` inserts a newline, and `Cmd/Ctrl + Enter` also submits.
*   **Pending:** KaTeX and Mermaid rendering are not yet implemented.

**Epic 3: Knowledge Extraction (P1)**
*   **Implemented:** Selecting assistant text shows a floating "Save Highlight" action; saved highlights appear in the Secondary Panel and are visually re-marked in the chat view.
*   **Implemented:** The Secondary Panel includes a notes editor that auto-saves after a 1-second debounce.

**Epic 4: Conversation Branching (P1)**
*   **Pending:** Clone-up-to-here, destructive regeneration, and truncate/replay flows are still backlog work.

**Epic 5: Organization & Search (P2)**
*   **Implemented:** Users can create, rename, delete, and collapse/expand folders in the sidebar.
*   **Pending:** Dragging chats between folders is not yet implemented.
*   **Implemented:** Semantic search queries `pgvector` embeddings and returns matching message metadata.
*   **Implemented:** `@` mentions open a chat picker and insert literal `@ChatTitle` references into the composer.
*   **Pending:** Mention-based context retrieval is not implemented; `@` references are not resolved into injected prompt context before send.

### 3.2. Feature Specifications with Priority Levels

| Feature | Priority | Status | Description |
| :--- | :--- | :--- | :--- |
| **AI SDK Streaming** | P0 | ✅ Done | `streamText` via `ai` + `@ai-sdk/anthropic`, using `claude-sonnet-4-6`. |
| **Stop Streaming** | P0 | ✅ Done | The composer exposes `chatInstance.stop()` while a response is streaming. |
| **CUID2 Optimistic UI** | P0 | ✅ Done | Chat/folder CRUD uses client IDs and rollback on failure. |
| **Chat/Folder CRUD** | P0 | ✅ Done | Current REST surface supports chat + folder create/update/delete flows in use today. |
| **Auto-Title** | P0 | ✅ Done | `onFinish` counts assistant replies and generates a short title on the first completion. |
| **Code Block Rendering** | P1 | ✅ Done | `marked` + `highlight.js` render assistant markdown with copy buttons. |
| **File Drop into Composer** | P1 | ✅ Done | `.txt` / `.md` files are read locally via `FileReader` and appended to the prompt. |
| **Highlights & Notes** | P1 | ✅ Done | Notes auto-save; highlights can be created, listed, deleted, and re-marked in the chat view. |
| **`@` Mention Picker** | P1 | ✅ Done | Dropdown inserts literal `@ChatTitle` text into the composer. |
| **Mention Context Injection** | P1 | ⏳ Pending | No automatic retrieval or payload augmentation runs for `@` references yet. |
| **Clone & Truncate** | P1 | ⏳ Pending | Branching and destructive regeneration flows are not implemented yet. |
| **Semantic Search** | P2 | ✅ Done | `POST /api/search` uses pgvector cosine distance with `text-embedding-3-small`. |
| **Drag-and-drop folders** | P2 | ⏳ Pending | Move chats between folders in the sidebar. |
| **KaTeX / Mermaid Rendering** | P2 | ⏳ Pending | Basic markdown is live; math/diagram rendering is still backlog work. |

### 3.3. Business Logic Descriptions
*   **Auto-Title Logic:** When the `onFinish` callback of the chat stream fires and `assistantCount === 1` (the first completed assistant response in the chat), the backend calls `generateText` with `claude-haiku-4-5-20251001`. The result updates `chats.title` in the database.
*   **File Drop Logic:** When a user drops a file into `MessageComposer.svelte`, the frontend checks the MIME type. If it is text-based, it uses the browser's `FileReader` API to extract the string, formats it as `\n\n--- File: filename.ext ---\n[CONTENT]\n---\n`, and appends it to the textarea. The file is never uploaded.
*   **Highlight Rendering Logic:** The chat page stores highlights against DB message IDs and, during markdown rendering, wraps matching text in `<mark class="bg-warning/50 rounded px-0.5">…</mark>`.
*   **`@` Mention Logic:** The composer detects the current token after `@`, shows matching chats, and inserts a literal `@ChatTitle` reference into the textarea. No prompt-time retrieval or `<context>` wrapping is implemented yet.

---

## 4. Technical Specifications

### 4.1. API Contracts

The current API surface is pre-auth. `POST /api/chats` and `POST /api/folders` call `getDefaultUserId()` to ensure a single default user exists, but there is no session-derived `userId`, `hooks.server.ts` protection, or comprehensive tenant isolation across all routes yet.

#### `POST /api/chat/:chatId` (AI Generation)
Powered by `ai` 6.x + `@ai-sdk/anthropic`. Model: `claude-sonnet-4-6`.
*   **Request** (current `Chat` / UIMessage format):
    ```json
    {
      "messages": [
        { "id": "cuid", "role": "user", "parts": [{ "type": "text", "text": "Hello" }] }
      ]
    }
    ```
*   **Response:** `text/event-stream` (UI Message Stream Protocol — `data: {"type":"text-delta",...}`).
*   **Side effects:** Saves user message on entry, assistant message in `onFinish`. ✅ Implemented.

#### Sidebar Initialization
Loaded via SvelteKit `+layout.server.ts` (not a standalone API endpoint). Returns `{ chats, folders }` as page data. ✅ Implemented.

#### `POST /api/chats` ✅
*   **Request:** `{ "id": "cuid", "folderId": null }`
*   **Runtime defaults:** `title` falls back to `New Chat`; `modelId` falls back to `claude-sonnet-4-6` in the route handler to match the current Anthropic chat runtime.
*   **Note:** The Drizzle schema still declares a `gpt-4o` column default for `chats.modelId`; that migration is intentionally deferred, so the route sets the runtime default explicitly.
*   **Response:** Full saved `Chat` row.

#### `PATCH /api/chats/:id` ✅
*   **Request:** `{ "title": "New name" }`
*   **Response:** Updated `Chat` row.

#### `DELETE /api/chats/:id` ✅
Cascades to messages. Returns `{ "success": true }`.

#### `GET /api/chats/:id` ✅
Returns full Chat row. Used by the chat page to refresh title after auto-title generation.
- **Response:** Full `Chat` row, 404 if not found.

#### `POST /api/folders` ✅
*   **Request:** `{ "id": "cuid", "name": "Work", "order": 0 }`
*   **Response:** Full saved `Folder` row.

#### `PATCH /api/folders/:id` ✅
*   **Request:** `{ "name": "New name" }`

#### `DELETE /api/folders/:id` ✅
Sets `chats.folderId = null` for affected chats (FK `onDelete: 'set null'`). Returns `{ "success": true }`.

#### `GET /api/chats/:chatId/messages` ✅
Returns all messages for a chat, ordered by `createdAt` ASC.
- **Response:** `Array<{ id, chatId, role, content, createdAt }>`

#### `POST /api/chats/:chatId/clone`
Not implemented in the current repository.

#### `POST /api/notes` ✅
- **Request:** `{ "chatId": "cuid", "content": "markdown text" }`
- **Response:** Full saved `Note` row (201).

#### `PATCH /api/notes/:id` ✅
- **Request:** `{ "content": "updated markdown" }`
- **Response:** Updated `Note` row.

#### `DELETE /api/notes/:id` ✅
Returns 204.

#### `GET /api/notes?chatId=:chatId` ✅
Returns all notes for a chat.

#### `POST /api/highlights` ✅
- **Request:** `{ "messageId": "cuid", "text": "selected text" }`
- Validates message exists; returns 404 if not.
- **Response:** Full `Highlight` row (201).

#### `DELETE /api/highlights/:id` ✅
Returns 204.

#### `GET /api/chats/:chatId/highlights` ✅
Returns all highlights for messages belonging to the chat (JOIN through messages table).

#### `POST /api/search` ✅
- **Request:** `{ "query": "semantic search string", "limit": 5 }`
- Generates embedding via OpenAI `text-embedding-3-small`; returns `[]` if `OPENAI_API_KEY` absent.
- **Response:** `Array<{ messageId, chatId, chatTitle, content, role, score }>` ordered by cosine similarity.

### 4.2. Database Schema Design (Summary)
*Refer to `02-domain-and-architecture.md` for the exact Drizzle ORM code.*
*   **Primary Keys:** `varchar(32)` using CUID2.
*   **Foreign Keys:** Strict `ON DELETE CASCADE` for `messages`, `notes`, and `highlights` referencing `chats`.
*   **Indexes:**
    *   B-Tree indexes on `user_id` and `chat_id` for fast relational lookups.
    *   HNSW (Hierarchical Navigable Small World) index on `messages.embedding` using `vector_cosine_ops` for lightning-fast semantic search.
*   **JSONB:** `tags` column on `chats` and `notes` to avoid junction tables.

### 4.3. Authentication and Authorization Approach
> **Current state:** pre-auth only. `getDefaultUserId()` in `src/lib/server/db/user.ts` auto-provisions a single default user, and there is no Auth.js session enforcement yet.

*   **Current implementation:** no `hooks.server.ts` gate, no login route, and no session-derived `event.locals.user` access pattern.
*   **Current data model:** `folders.userId` and `chats.userId` exist in the schema, but most routes do not yet apply per-user filters on reads/updates/deletes.
*   **Planned direction:** Auth.js for SvelteKit plus systematic tenant isolation remains future work, not a shipped capability.

### 4.4. Error Handling Strategies
*   **API Layer:** Some routes throw explicit SvelteKit errors (for example 404s on missing chats/notes), but the API surface is not uniformly wrapped in `try/catch` helpers.
*   **AI Streaming Errors:** The streaming route relies on the `streamText` result and normal route failure behavior; there is no `useChat`-style shared error object in the current client.
*   **UI Layer (Toasts):** Chat/folder CRUD and highlight actions surface failures with toast messages and, where implemented, local rollback. Note saves currently favor silent retry-by-user over explicit toast handling.

### 4.5. Performance Requirements and Constraints
1.  **Message Pagination:** Chats with 1,000+ messages will crash the DOM. The UI must implement an Intersection Observer to fetch older messages using the `?cursor=` API as the user scrolls up.
2.  **Embedding Generation:** The `/api/chat/:id` endpoint generates assistant embeddings asynchronously after the message is saved. If `OPENAI_API_KEY` is missing, embedding generation and semantic search degrade gracefully.
3.  **Optimistic UI Latency:** User actions (creating folders, sending messages, saving notes) must reflect in the DOM in `< 16ms` (1 frame). Network requests happen asynchronously.
4.  **Database Connectivity:** The app currently uses the `postgres` driver directly from `DATABASE_URL`; if deployed in a tighter serverless environment, connection strategy may need to be revisited.