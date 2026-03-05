**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** UI/UX & State Management

**Version:** 1.1 (Lean V1 + Cloning)

---

## 1. State Management (Svelte 5 Runes)

We completely discard Svelte 4 `writable` stores. The entire application state is managed by a single, reactive class using Svelte 5 `$state` and `$derived` runes. This ensures perfect synchronization across the Sidebar, Chat Area, and Secondary Panel.

**File:** `src/lib/state/app.svelte.ts`
```typescript
import { createId } from '@paralleldrive/cuid2';
import type { Chat, Folder, Note, Highlight } from '$lib/server/db/schema';

export class AppState {
  // Core State
  chats = $state<Chat[]>([]);
  folders = $state<Folder[]>([]);
  notes = $state<Note[]>([]);
  highlights = $state<Highlight[]>([]);
  
  // UI State
  activeChatId = $state<string | null>(null);
  isSidebarOpen = $state(true);
  secondaryPanelTab = $state<'notes' | 'highlights' | 'closed'>('closed');

  // Derived State (Auto-updates when core state changes)
  activeChat = $derived(this.chats.find(c => c.id === this.activeChatId));
  activeNotes = $derived(this.notes.filter(n => n.chatId === this.activeChatId));
  
  // Optimistic UI Methods
  createFolder(name: string) {
    const newFolder = { id: createId(), name, order: this.folders.length, createdAt: new Date() };
    this.folders.push(newFolder); // Instantly updates UI
    // TODO: Trigger background fetch(/api/folders, { method: 'POST' })
    // If fetch fails, remove from array and show Toast.
  }
}

export const app = new AppState();
```

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
*   **Tech:** Uses the `useChat` hook from `@ai-sdk/svelte`.
*   **Context Injection (`@` Mentions):** 
    *   Listens for the `@` keydown event.
    *   Opens a floating popover to search `app.chats` and `app.notes`.
    *   When the user submits, it intercepts the string, replaces `@ChatTitle` with the actual text wrapped in `<context>` tags, and passes it to the `append()` function of the AI SDK.

### 3.2. `MessageItem.svelte` (Text Selection & Highlights)
*   **Role:** Renders individual messages (Markdown) and handles the Highlight creation UX.
*   **Interaction:**
    1. User highlights text using their mouse.
    2. The `onmouseup` event triggers `window.getSelection()`.
    3. A `TreeWalker` calculates the exact `startOffset` and `endOffset` relative to the raw markdown string.
    4. A floating toolbar appears with color options (🟡 🟢 🔴).
    5. Clicking a color optimistically adds the Highlight to `app.highlights` and triggers the API.

### 3.3. `SecondaryPanel.svelte`
*   **Role:** The right-hand sidebar for Knowledge Extraction.
*   **Tabs:** Toggles between `NotesList.svelte` and `HighlightsList.svelte`.
*   **Behavior:** Automatically filters its content based on `app.activeChatId`. If the user switches chats, the notes and highlights instantly swap to match the new chat.

### 3.4. `ChatHistory.svelte` (Branching UI)
*   **Role:** Renders the list of messages.
*   **Clone Action:** Hovering over any message reveals a "Clone up to here" button. Clicking it triggers `POST /api/chats/:id/clone`, waits for the new `chatId`, and navigates the user to the new chat.

---

## 4. UX Interaction Patterns

*   **Optimistic Updates:** Every CRUD operation (Create Folder, Rename Chat, Add Note, Add Highlight) generates a `cuid2` on the client and updates the `app.svelte.ts` state *before* the network request finishes.
*   **Streaming Indicators:** The Vercel AI SDK provides an `$isLoading` store. When true, a DaisyUI `loading-dots` spinner appears at the bottom of the chat.
*   **Error Boundaries & Toasts:** If an optimistic API call fails, the catch block removes the item from the `$state` array and triggers a global Toast notification (e.g., "Network error: Failed to save note").

---
---

# 📄 05-implementation-phases.md

**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)
**Document:** Implementation Phases & Checkpoints
**Version:** 1.1 (Lean V1 + Cloning)

---

## 🚀 Implementation Strategy
This plan is designed for an AI coding assistant or human developer. **Do not skip phases.** Each phase must pass its Validation Checkpoint before moving to the next.

---

### Phase 1: Foundation & Database (Days 1-2)
**Goal:** Set up the SvelteKit project, Drizzle ORM, and the PostgreSQL schema.

1.  Initialize SvelteKit v5, Tailwind v4, and DaisyUI.
2.  Install dependencies: `drizzle-orm`, `postgres`, `pgvector`, `@paralleldrive/cuid2`, `ai`, `@ai-sdk/svelte`.
3.  Create `src/lib/server/db/schema.ts` exactly as defined in `02-architecture-and-data-model.md`.
4.  Generate and push the database migration.
5.  Create the base Repository layer (`chat.repository.ts`) with basic CRUD.

*   **🛑 Checkpoint 1:** Run a test script to insert a User and a Chat into the database. Verify the `cuid2` IDs and `createdAt` timestamps are correct in pgAdmin/DBeaver.

---

### Phase 2: Core Chat & AI Streaming (Days 3-4)
**Goal:** Get a basic conversation working with the Vercel AI SDK.

1.  Create `src/routes/api/chat/[id]/+server.ts`. Implement the `streamText` function using the OpenAI provider.
2.  Implement the `onFinish` callback to save the Assistant's message to the database.
3.  Create `ChatView.svelte` and `MessageComposer.svelte` using the `useChat` hook.
4.  Implement the "Clone & Truncate" SQL logic in the repository and expose it via `POST /api/chats/[id]/clone`.

*   **🛑 Checkpoint 2:** Open the browser. Type a message. Verify the AI streams back a response. Check the database to ensure both the User message and Assistant message were saved with the correct `chatId`.

---

### Phase 3: State Management & Organization (Days 5-6)
**Goal:** Implement the Sidebar, Folders, and global state.

1.  Create `src/lib/state/app.svelte.ts` using Svelte 5 runes.
2.  Create `src/routes/+layout.server.ts` to load all Folders and Chats (metadata only) on initial page load.
3.  Build `Sidebar.svelte` and `FolderTree.svelte`.
4.  Implement optimistic UI for creating folders and renaming chats.
5.  Add JSONB Tagging UI (a simple input that adds strings to the `tags` array).

*   **🛑 Checkpoint 3:** Create a folder, drag a chat into it, and rename the chat. Refresh the page. Ensure the state persisted to the database and loaded correctly.

---

### Phase 4: Knowledge Extraction (Days 7-8)
**Goal:** Implement Highlights, Notes, and the Secondary Panel.

1.  Build `SecondaryPanel.svelte` with tabs for Notes and Highlights.
2.  Implement `POST /api/notes` and `POST /api/highlights`.
3.  Update `MessageItem.svelte` with the `window.getSelection()` logic to calculate offsets and trigger the Highlight popover.
4.  Implement the Markdown editor for Notes with a 1-second debounce auto-save.

*   **🛑 Checkpoint 4:** Highlight a sentence in an AI response. Select "Yellow". Verify it appears in the Secondary Panel. Write a Note. Refresh the page and ensure both are still attached to the active chat.

---

### Phase 5: Power Features (Days 9-10)
**Goal:** Implement Semantic Search and `@` Mentions.

1.  Update the `onFinish` AI callback to synchronously generate a `text-embedding-3-small` vector and save it to `messages.embedding`.
2.  Create `POST /api/search` using Drizzle's `vector_cosine_ops` to find similar messages.
3.  Build `SearchPanel.svelte` in the UI.
4.  Update `MessageComposer.svelte` to intercept `@` keystrokes, show a dropdown of past chats, and inject the selected text into the prompt payload.

*   **🛑 Checkpoint 5:** Send a message about "SvelteKit routing". Open the Search Panel and search for "frontend navigation". Verify the semantic search returns the SvelteKit message even though the exact keywords don't match.

---

### Phase 6: Polish & Deployment (Day 11)
1.  Implement global Error Boundaries and Toast notifications.
2.  Ensure mobile responsiveness (Sidebar collapses into a hamburger menu).
3.  Deploy to Vercel. Provision a Neon Postgres or Supabase database with `pgvector` enabled.

*   **🎉 Final Checkpoint:** Run the full End-to-End user flow in the production environment.