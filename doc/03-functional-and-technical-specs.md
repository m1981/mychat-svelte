**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** Functional & Technical Specifications
**Version:** 1.2 (Lean V1 + Rich UX & Cloning)

---

## 3. Functional Requirements

### 3.1. User Stories with Acceptance Criteria

**Epic 1: Core Chat & AI Interaction (P0)**
*   **Story:** As a user, I want to send messages and see the response stream in real-time.
    *   *AC 1:* The UI displays a typewriter effect as chunks arrive.
    *   *AC 2:* The UI auto-scrolls to the bottom as new text appears.
    *   *AC 3:* I can click a "Stop" button to abort the generation mid-stream.
*   **Story:** As a user, I want my chats to be automatically named so I don't have a sidebar full of "New Chat".
    *   *AC 1:* After the first AI response completes, the chat title updates automatically to a 3-5 word summary.

**Epic 2: Rich Content & UX (P1)**
*   **Story:** As a user, I want the AI's code, math, and diagrams to be formatted beautifully.
    *   *AC 1:* Code blocks have syntax highlighting and a "Copy" button.
    *   *AC 2:* LaTeX equations render properly using KaTeX.
    *   *AC 3:* Mermaid code blocks render as actual SVG diagrams.
*   **Story:** As a user, I want to quickly include local files in my prompt.
    *   *AC 1:* Dragging a `.txt` or `.md` file into the composer extracts the text and pastes it into the input box.
*   **Story:** As a user, I want to use keyboard shortcuts for speed.
    *   *AC 1:* `Ctrl/Cmd + Enter` submits the prompt. `Shift + Enter` creates a new line.

**Epic 3: Knowledge Extraction (P1)**
*   **Story:** As a user, I want to highlight text in an AI response and save it.
    *   *AC 1:* Selecting text triggers a floating "Save Highlight" button.
    *   *AC 2:* Saved highlights appear in the right-hand Secondary Panel.
    *   *AC 3:* The highlighted text is visually distinct (e.g., yellow background) in the main chat window.
*   **Story:** As a user, I want to write markdown notes attached to the current chat.
    *   *AC 1:* The Secondary Panel has a "Notes" tab with a markdown editor.
    *   *AC 2:* Notes auto-save to the database 1 second after the user stops typing (debounce).

**Epic 3: Conversation Branching (P1)**
*   **Story:** As a user, I want to clone a chat up to a specific message so I can try a different prompt without ruining my current context.
    *   *AC 1:* Every message has a "Clone up to here" button.
    *   *AC 2:* Clicking it creates a new chat titled "[Original Title] (Copy)".
    *   *AC 3:* The new chat contains all messages from the start up to the selected message.
*   **Story:** As a user, I want to edit a past message and regenerate the response.
    *   *AC 1:* Submitting an edited message shows a warning modal: "This will delete all subsequent messages."
    *   *AC 2:* Confirming truncates the chat and streams a new AI response.

**Epic 4: Organization & Search (P2)**
*   **Story:** As a user, I want to organize chats into folders.
    *   *AC 1:* I can create a folder and drag a chat into it.
    *   *AC 2:* Folders can be collapsed/expanded in the sidebar.
*   **Story:** As a user, I want to search my past conversations by concept, not just exact keywords.
    *   *AC 1:* The search bar queries the `pgvector` embeddings.
    *   *AC 2:* Results show the Chat Title and a snippet of the matching message.

### 3.2. Feature Specifications with Priority Levels

| Feature | Priority | Status | Description |
| :--- | :--- | :--- | :--- |
| **AI SDK Streaming** | P0 | ✅ Done | `streamText` via `@ai-sdk/anthropic`, `claude-sonnet-4-6`. |
| **CUID2 Optimistic UI** | P0 | ✅ Done | Instant UI updates with rollback for all chat/folder mutations. |
| **Chat/Folder CRUD** | P0 | ✅ Done | Full REST API + DB persistence. |
| **Auto-Title** | P0 | ⏳ Pending | Title update after first AI exchange (Track 1 bonus). |
| **Clone & Truncate** | P1 | ⏳ Pending | SQL-level duplication of chats and vector embeddings. |
| **Highlights & Notes** | P1 | ⏳ Pending | Secondary panel for knowledge extraction (Track 2). |
| **Context Injection (`@`)** | P1 | ⏳ Pending | Frontend interception of `@` mentions to build prompts. |
| **Semantic Search** | P2 | ⏳ Pending | `pgvector` cosine similarity search across messages. |
| **Drag-and-drop folders** | P2 | ⏳ Pending | Move chats between folders in sidebar. |

### 3.3. Business Logic Descriptions
*   **Auto-Title Logic:** When the `onFinish` callback of the Vercel AI SDK fires for the *first* message in a chat, the backend asynchronously triggers a secondary, non-streaming LLM call (using a fast model like `claude-haiku-4-5`). The prompt is: *"Generate a concise, descriptive title (5 words or less) for this conversation based on this prompt: [USER_PROMPT]"*. The result updates the `chats.title` column via `PATCH /api/chats/:id`. **Status: not yet implemented.**
*   **File Drop Logic:** When a user drops a file into the `MessageComposer.svelte`, the frontend checks the MIME type. If it is a text-based file, it uses the browser's `FileReader` API to extract the string, formats it as `\n\n--- File: filename.ext ---\n[CONTENT]\n---\n\n`, and appends it to the textarea. The file itself is never uploaded to the server.
*   **Vector Cloning Logic:** When executing "Clone up to here", the backend uses `INSERT INTO messages ... SELECT ... FROM messages`. It copies the raw vector data directly within PostgreSQL to ensure the operation is instant and free.
*   **Context Injection Logic:** The backend API (`/api/chat/:id`) expects a standard array of `{ role, content }` objects. The frontend is strictly responsible for finding `@` mentions, fetching the referenced text from the Svelte `$state`, and formatting it as `<context>[TEXT]</context>` at the top of the user's prompt string before transmission.

---

## 4. Technical Specifications

### 4.1. API Contracts

All endpoints require authentication. The `userId` is extracted from the session (e.g., `event.locals.user.id`) and applied to every database query to ensure tenant isolation.

#### `POST /api/chat/:chatId` (AI Generation)
Powered by Vercel AI SDK v6 + `@ai-sdk/anthropic`. Model: `claude-sonnet-4-6`.
*   **Request** (AI SDK v6 UIMessage format):
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
*   **Response:** Full saved `Chat` row.

#### `PATCH /api/chats/:id` ✅
*   **Request:** `{ "title": "New name" }`
*   **Response:** Updated `Chat` row.

#### `DELETE /api/chats/:id` ✅
Cascades to messages. Returns `204`.

#### `POST /api/folders` ✅
*   **Request:** `{ "id": "cuid", "name": "Work", "order": 0 }`
*   **Response:** Full saved `Folder` row.

#### `PATCH /api/folders/:id` ✅
*   **Request:** `{ "name": "New name" }`

#### `DELETE /api/folders/:id` ✅
Sets `chats.folderId = null` for affected chats (FK `onDelete: 'set null'`). Returns `204`.

#### `GET /api/chats/:chatId/messages` (Cursor Pagination)
*   **Query Params:** `?cursor=<messageId>&limit=50`
*   **Response:**
    ```json
    {
      "messages": [
        { "id": "msg1", "role": "user", "content": "Hello", "createdAt": "..." }
      ],
      "nextCursor": "msg50"
    }
    ```

#### `POST /api/chats/:chatId/clone`
*   **Request:** `{ "upToMessageId": "msg_abc123" }`
*   **Response:** `{ "newChatId": "chat_xyz789" }`

#### `POST /api/search`
*   **Request:** `{ "query": "How do I configure SvelteKit?" }`
*   **Response:** Array of results with `similarityScore`.

### 4.2. Database Schema Design (Summary)
*Refer to `02-architecture-and-data-model.md` for the exact Drizzle ORM code.*
*   **Primary Keys:** `varchar(32)` using CUID2.
*   **Foreign Keys:** Strict `ON DELETE CASCADE` for `messages`, `notes`, and `highlights` referencing `chats`.
*   **Indexes:**
    *   B-Tree indexes on `user_id` and `chat_id` for fast relational lookups.
    *   HNSW (Hierarchical Navigable Small World) index on `messages.embedding` using `vector_cosine_ops` for lightning-fast semantic search.
*   **JSONB:** `tags` column on `chats` and `notes` to avoid junction tables.

### 4.3. Authentication and Authorization Approach
*   **Library:** Auth.js for SvelteKit (formerly NextAuth).
*   **Strategy:** OAuth (GitHub/Google) or Magic Links. No password management.
*   **Authorization (Tenant Isolation):** Every single database query in the Repository layer *must* include a `where: eq(table.userId, currentUserId)` clause.
    *   *Example:* `db.select().from(chats).where(and(eq(chats.id, reqId), eq(chats.userId, session.user.id)))`
*   **Route Protection:** A SvelteKit `hooks.server.ts` middleware intercepts all `/api/*` and `/chat/*` routes, redirecting unauthenticated users to `/login`.

### 4.4. Error Handling Strategies
*   **API Layer:** All API routes wrap logic in `try/catch`. Expected errors (e.g., 404 Not Found, 403 Forbidden) throw SvelteKit `error(status, message)`. Unexpected server errors log to the console and return a generic 500.
*   **AI Streaming Errors:** If the OpenAI/Anthropic API fails mid-stream (e.g., rate limit), the Vercel AI SDK's `onError` callback catches it. The frontend `useChat` hook exposes an `error` object.
*   **UI Layer (Toasts):** The Svelte frontend watches for rejected promises or `error` states. It triggers a global Toast notification (e.g., "Failed to save note. Please try again.") and reverts any optimistic UI changes.

### 4.5. Performance Requirements and Constraints
1.  **Message Pagination:** Chats with 1,000+ messages will crash the DOM. The UI must implement an Intersection Observer to fetch older messages using the `?cursor=` API as the user scrolls up.
2.  **Synchronous Embedding Limits:** The `/api/chat/:id` endpoint generates embeddings synchronously. To prevent Vercel function timeouts (usually 10-60s), the text sent to the `text-embedding-3-small` model must be truncated to a maximum of 8,191 tokens (OpenAI's limit).
3.  **Optimistic UI Latency:** User actions (creating folders, sending messages, saving notes) must reflect in the DOM in `< 16ms` (1 frame). Network requests happen asynchronously.
4.  **Database Connection Pooling:** Because SvelteKit runs in a serverless environment, direct Postgres connections will exhaust the database connection limit. The app must connect to the database using a connection pooler (e.g., Supabase PgBouncer or Neon Serverless Driver).