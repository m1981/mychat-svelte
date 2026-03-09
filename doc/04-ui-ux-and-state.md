**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** UI/UX & State Management

**Version:** 1.2 (Phases 1-5 Complete — 2026-03-09)

---

## 1. State Management (Svelte 5 Runes)

We completely discard Svelte 4 `writable` stores. The entire application state is managed by a single, reactive class using Svelte 5 `$state` and `$derived` runes. This ensures perfect synchronization across the Sidebar, Chat Area, and Secondary Panel.

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

---

## 2. UI Layout & Composition

The application uses a CSS Grid layout to ensure the Composer stays fixed at the bottom while the chat scrolls, and sidebars can collapse without reflow jank.

```text
┌─────────────────────────────────────────────────────────────────┐
│                          HEADER (Model Select, Search Toggle)   │
├──────────┬─────────────────────────────────┬────────────────────┤
│          │                                 │                    │
│ SIDEBAR  │        MAIN CHAT AREA           │  SECONDARY PANEL   │
│ (Folders,│                                 │ (Notes, Highlights)│
│  Chats)  │  ┌──────────────────────────┐   │                    │
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

---

## 3. Core Components

### 3.1. `MessageComposer.svelte`
*   **Role:** The primary input area.
*   **Tech:** Uses the `Chat` class and `DefaultChatTransport` from the Vercel AI SDK v6 (not the `useChat` hook).
*   **`@` Mentions:**
    *   Typing `@` opens a floating dropdown filtered against `app.chats` by the text typed after `@`.
    *   Selecting a chat inserts `@ChatTitle` as a text reference into the textarea.
    *   This is a text reference only — context injection into the prompt payload is not yet implemented.

### 3.2. `MessageItem.svelte` (Text Selection & Highlights)
*   **Role:** Renders individual messages (Markdown) and handles the Highlight creation UX.
*   **Interaction:**
    1. User highlights text using their mouse on an assistant bubble.
    2. The `onmouseup` event triggers `window.getSelection()`.
    3. A fixed-position "Save Highlight" popover appears above the selection.
    4. Clicking "Save Highlight" saves the highlight via the API.
*   **Not implemented:** `TreeWalker`-based offset calculation and color selection.

### 3.3. `SecondaryPanel.svelte`
*   **Role:** The right-hand sidebar for Knowledge Extraction.
*   **Tabs:** Three tabs — `NotesList.svelte`, `HighlightsList.svelte`, and a **Search** tab with a debounced input that calls `app.search()`.
*   **Behavior:** Automatically filters its content based on `app.activeChatId`. If the user switches chats, the notes and highlights instantly swap to match the new chat.

### 3.4. Clone/Truncate (Pending)
*   The "Clone up to here" chat history branching UI is not yet implemented.

---

## 4. UX Interaction Patterns

*   **Optimistic Updates:** Every CRUD operation (Create Folder, Rename Chat, Add Note, Add Highlight) generates a `cuid2` on the client and updates the `app.svelte.ts` state *before* the network request finishes.
*   **Streaming Indicators:** Streaming state is tracked via `chatInstance.status` from the `Chat` class (Vercel AI SDK v6). When active, a DaisyUI `loading-dots` spinner appears at the bottom of the chat.
*   **dbMessageMap:** The chat page maintains a `Map<sdkMessageId, dbMessageId>` that is refreshed after each stream completes (via `GET /api/chats/:id/messages`). This is needed because the AI SDK generates its own IDs for messages, but highlights require the real DB IDs.
*   **Error Boundaries & Toasts:** If an optimistic API call fails, the catch block removes the item from the `$state` array and triggers a global Toast notification (e.g., "Network error: Failed to save note").
