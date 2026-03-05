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