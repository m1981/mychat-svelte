**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** UI/UX & State Management

**Version:** 1.3 (Current-state aligned — 2026-03-09)

## 1. State Management (Svelte 5 Runes)

The application state is managed by a single reactive class using Svelte 5 `$state` runes plus getter-based derived values. This keeps the Sidebar, Chat Area, and Secondary Panel in sync without a separate store layer.

**File:** `src/lib/state/app.svelte.ts`

```typescript
// File: src/lib/state/app.svelte.ts
class AppState {
  // Core Data
  chats = $state<Chat[]>([]);
  folders = $state<Folder[]>([]);
  notes = $state<Note[]>([]);
  highlights = $state<Highlight[]>([]);
  searchResults = $state<SearchResult[]>([]);
  searchQuery = $state('');

  // UI State
  activeChatId = $state<string | null>(null);
  isSidebarOpen = $state(true);
  secondaryPanelTab = $state<'notes' | 'highlights' | 'search' | 'closed'>('closed');

  // Derived (via getters)
  get activeChat() { ... }
  get activeNotes() { ... }

  // Chat mutations (all async, optimistic with rollback)
  async createChat(folderId?)
  async renameChat(id, title)
  async deleteChat(id)

  // Folder mutations
  async createFolder(name)
  async renameFolder(id, name)
  async deleteFolder(id)

  // Knowledge
  async loadChatKnowledge(chatId)  // fetches notes + highlights
  async saveNote(chatId, content)  // create or update (upsert)
  async saveHighlight(messageId, text)
  async deleteHighlight(id)

  // Search
  async search(query)  // POST /api/search, updates searchResults
}
```

**Rule**: files using `$state`/`$derived`/`$effect` must end in `.svelte.ts` or `.svelte.js`. Plain `.ts` files cause `rune_outside_svelte` SSR errors.

## 2. UI Layout & Composition

The application uses a three-column CSS Grid layout: left sidebar, main chat area, and an optional right-hand secondary panel. The header is currently a placeholder slot rather than a full control surface.

```text
┌─────────────────────────────────────────────────────────────────┐
│                               HEADER (placeholder)              │
├──────────┬─────────────────────────────────┬────────────────────┤
│          │                                 │                    │
│ SIDEBAR  │        MAIN CHAT AREA           │  SECONDARY PANEL   │
│ (Folders,│                                 │ (Notes/Highlights/ │
│  Chats)  │                                 │ Search)            │
│          │  ┌──────────────────────────┐   │                    │
│          │  │ User: Hello              │   │  ┌──────────────┐  │
│          │  │ AI: Hi! How can I help?  │   │  │ 📝 Note      │  │
│          │  │ User: Explain...         │   │  │ "Remember..."│  │
│          │  │ AI: Sure! [highlighted]  │   │  └──────────────┘  │
│          │  └──────────────────────────┘   │                    │
│          │                                 │                    │
│          │  ┌──────────────────────────┐   │                    │
│          │  │ [@Chat-123]              │   │                    │
│          │  │ Type message...      [↑] │   │                    │
│          │  └──────────────────────────┘   │                    │
└──────────┴─────────────────────────────────┴────────────────────┘
```

## 3. Core Components

### 3.1. `MessageComposer.svelte`

- **Role:** The primary input area.
- **Tech:** Uses the `Chat` class from `@ai-sdk/svelte` and `DefaultChatTransport` from `ai` (not the old `useChat` hook).
- **`@` Mentions:**
  - Typing `@` opens a floating dropdown filtered against `app.chats` by the text typed after `@`.
  - Selecting a chat inserts `@ChatTitle` as a text reference into the textarea.
  - This is a text reference only — context injection into the prompt payload is not yet implemented.
- **Other shipped behavior:** While streaming, the composer swaps the send button for a stop button. Dragging a `.txt` or `.md` file into the textarea appends its contents locally.

### 3.2. Chat page message rendering & highlights (`src/routes/chat/[id]/+page.svelte`)

- **Role:** The chat page renders assistant/user messages and owns the current Highlight creation UX.
- **Interaction:**
    1. User highlights text using their mouse on an assistant bubble.
    2. The `onmouseup` event triggers `window.getSelection()`.
    3. A fixed-position "Save Highlight" popover appears above the selection.
    4. Clicking "Save Highlight" saves the highlight via the API.
- **Not implemented:** `TreeWalker`-based offset calculation and color selection.
- **Current rendering approach:** Saved highlights are re-applied in the chat view by wrapping exact text matches in `<mark>` styling during markdown render.

### 3.3. `SecondaryPanel.svelte`

- **Role:** The right-hand sidebar for Knowledge Extraction.
- **Tabs:** Three tabs — `NotesTab.svelte`, `HighlightsTab.svelte`, and `SearchTab.svelte` with a debounced input that calls `app.search()`.
- **Behavior:** Automatically filters its content based on `app.activeChatId`. If the user switches chats, the notes and highlights instantly swap to match the new chat.

### 3.4. Clone/Truncate (Pending)

- The "Clone up to here" chat history branching UI is not yet implemented.

## 4. UX Interaction Patterns

- **Optimistic Updates:** Chat/folder create/rename/delete flows are optimistic with rollback. Highlight deletion is optimistic too. Note creation/update and highlight creation wait for the server response before mutating local state.
- **Streaming Indicators:** Streaming state is tracked via `chatInstance.status`. When active, a DaisyUI `loading-dots` bubble appears in the chat and the composer shows a stop button.
- **dbMessageMap:** The chat page maintains a `Map<sdkMessageId, dbMessageId>` that is refreshed after each stream completes (via `GET /api/chats/:id/messages`). This is needed because the AI SDK generates its own IDs for messages, but highlights require the real DB IDs.
- **Error Boundaries & Toasts:** The app mounts a top-level `ErrorBoundary` and `ToastContainer`. Chat/folder CRUD and highlight actions surface failures via toasts; note saves currently do not show dedicated toast errors.