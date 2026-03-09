**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** Implementation Phases & Checkpoints

**Version:** 1.3 (Phases 1-5 Complete — 2026-03-09)

---

## 🚀 Implementation Strategy
This plan is designed for an AI coding assistant or human developer. **Do not skip phases.** Each phase must pass its Validation Checkpoint before moving to the next.

---

### ✅ Phase 1: Foundation & Database — COMPLETE
**Goal:** Set up the SvelteKit project, Drizzle ORM, and the PostgreSQL schema.

1.  ✅ Initialized SvelteKit 2 + Svelte 5, Tailwind v4, DaisyUI.
2.  ✅ Dependencies installed for the shipped stack include `drizzle-orm`, `postgres`, `@paralleldrive/cuid2`, `ai`, `@ai-sdk/svelte`, `@ai-sdk/anthropic`, and `@ai-sdk/openai`.
3.  ✅ `src/lib/server/db/schema.ts` — users, folders, chats, messages, notes, highlights with HNSW pgvector index.
4.  ✅ Schema pushed to Neon PostgreSQL via `pnpm db:push`.
5.  ✅ `src/lib/server/db/user.ts` — `getDefaultUserId()` pre-auth shim (auto-provisions default user).

**Notes:**
- `pgvector` extension must be enabled before first push: `CREATE EXTENSION IF NOT EXISTS vector;`
- `pnpm db:push --force` still shows interactive prompts for column-rename detection; safest reset path is drop-all tables via Neon MCP + re-push.
- Neon project: `summer-thunder-21343395` (Azure, gwc region).

*   **✅ Checkpoint 1:** Schema matches `src/lib/server/db/schema.ts`. Default user auto-provisioned on first API call.

---

### ✅ Phase 2: Core Chat & AI Streaming — COMPLETE
**Goal:** Get a basic conversation working with the Vercel AI SDK.

1.  ✅ `src/routes/api/chat/[id]/+server.ts` — `streamText` using **Anthropic** provider (`claude-sonnet-4-6`).
2.  ✅ `onFinish` callback saves the assistant message to DB.
3.  ✅ `src/routes/chat/[id]/+page.svelte` — uses `@ai-sdk/svelte` `Chat` class + `DefaultChatTransport`.
4.  ✅ `MessageComposer.svelte` — textarea with Enter-to-submit, stop button during stream, and `.md` / `.txt` file drop.
5.  ✅ Assistant markdown rendered with `marked` + `highlight.js`, including copy buttons for code blocks.

**Key implementation detail:** API keys must be loaded via SvelteKit's `$env/static/private` (not `process.env`) — Vite's SSR does not inject `.env` values into `process.env` for server routes. Example:
```ts
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { createAnthropic } from '@ai-sdk/anthropic';
const anthropic = createAnthropic({ apiKey: ANTHROPIC_API_KEY });
```

*   **✅ Checkpoint 2:** `curl POST /api/chat/:id` streams `data: {"type":"text-delta"...}` events. Both user and assistant messages saved to DB. Verified 2026-03-09.

---

### ✅ Phase 3: State Management & Organization — COMPLETE
**Goal:** Implement the Sidebar, Folders, and global state with full DB persistence.

1.  ✅ `src/lib/state/app.svelte.ts` — Svelte 5 runes class with optimistic mutations + rollback on all CRUD ops.
2.  ✅ `src/routes/+layout.server.ts` — loads all folders and chats (metadata only) on page load.
3.  ✅ Sidebar, `ChatFolder.svelte`, `ChatHistory.svelte`, `NewChat.svelte`, `NewFolder.svelte` built.
4.  ✅ Full optimistic UI: `createChat`, `renameChat`, `deleteChat`, `createFolder`, `renameFolder`, `deleteFolder` — all wired to REST API with toast-on-error + state rollback.
5.  ✅ API routes: `POST/api/chats`, `PATCH/DELETE /api/chats/[id]`, `POST /api/folders`, `PATCH/DELETE /api/folders/[id]`.

**Key implementation detail:** Files using `$state` runes must be `.svelte.ts` / `.svelte.js`, not plain `.ts`. `src/lib/stores/toast.store.svelte.ts` was renamed for this reason.

*   **✅ Checkpoint 3:** Create chat → verify DB row. Rename chat → refresh → title persists. Delete chat → DB cascade. Create/rename/delete folder → all persist. Verified 2026-03-09.

**Open backlog after Phase 3:**
- [ ] Drag-and-drop to move chats into folders
- [ ] Clone / truncate branching flows

---

### ✅ Phase 4: Knowledge Extraction — COMPLETE (2026-03-09)
**Goal:** Implement Highlights, Notes, and the Secondary Panel.

1.  ✅ Built `SecondaryPanel.svelte` with Notes and Highlights flows, later extended with Search in Phase 5.
2.  ✅ Implemented `POST/GET /api/notes`, `PATCH /api/notes/[id]`, `POST /api/highlights`, `DELETE /api/highlights/[id]`, and `GET /api/chats/[id]/highlights`.
3.  ✅ Added assistant-message text selection with a fixed "Save Highlight" popover.
4.  ✅ Implemented `NotesTab.svelte` with 1-second debounce auto-save and `HighlightsTab.svelte` with delete support.
5.  ✅ Saved highlights are re-marked in assistant messages in the chat view.

*   **✅ Checkpoint 4:** Highlight assistant text → save it → verify it appears in the Secondary Panel and renders highlighted in the chat. Write a note, refresh, and confirm the note/highlights reload for the active chat. Verified 2026-03-09.

---

### ✅ Phase 5: Power Features — COMPLETE (2026-03-09)
**Goal:** Implement Semantic Search and `@` Mentions.

1.  ✅ Updated `onFinish` to fire-and-forget embedding generation via OpenAI `text-embedding-3-small` (non-blocking; gracefully skipped if `OPENAI_API_KEY` not set).
2.  ✅ `POST /api/search` — generates query embedding, performs cosine distance query (`<=>`) against `messages.embedding`, returns top-N results with `messageId`, `chatId`, `chatTitle`, `content`, `role`, `score`.
3.  ✅ `SearchTab.svelte` — search input with 400ms debounce, result cards showing chat title + content excerpt, click navigates to chat.
4.  ✅ `SecondaryPanel.svelte` updated with 3rd "Search" tab.
5.  ✅ `MessageComposer.svelte` — `@` keystroke detection, floating dropdown of matching chats, selection inserts `@ChatTitle` into input.

**Notes:**
- Embedding uses `@ai-sdk/openai` with `createOpenAI({ apiKey: env.OPENAI_API_KEY })` (dynamic env import)
- `$env/dynamic/private` used instead of `$env/static/private` for optional keys (won't crash build if missing)
- Search returns `[]` when `OPENAI_API_KEY` not set (graceful degradation)

*   **✅ Checkpoint 5:** Vitest + Playwright coverage was used to verify search and composer flows. Screenshots cover the search panel, empty state, `@` dropdown, and inserted mention. Verified 2026-03-09.

---

### Phase 6: Polish & Deployment (Day 11)
1.  Complete auth/session enforcement and real tenant isolation.
2.  Finish mobile/sidebar reopen UX and replace placeholder header content.
3.  Implement backlog items still outside the shipped surface (drag-and-drop folders, branching/truncate, richer markdown rendering).
4.  Deploy to Vercel and validate the production flow against Neon with `pgvector` enabled.

*   **🎉 Final Checkpoint:** Run the full End-to-End user flow in the production environment.