# Implementation Plan — BetterChatGPT

**Last Updated:** 2026-03-09
**Status:** Phases 1–5 complete. Remaining work is polish, auth hardening, and backlog items that are still intentionally unimplemented.

> **Canonical reference:** `05-implementation-phases.md` is the authoritative phase-by-phase record with checkpoints and notes. This document is a quick-reference summary of what's done and what's next.

---

## ✅ What's Built (Phases 1–5)

### Phase 1 — Foundation & Database
- SvelteKit 2 + Svelte 5 runes + Tailwind v4 + DaisyUI v5 project scaffold
- Drizzle ORM schema: `users`, `folders`, `chats`, `messages`, `notes`, `highlights`
- `messages.embedding` — 1536-dim vector column with HNSW cosine index (pgvector)
- Neon PostgreSQL provisioned; `pgvector` extension enabled; schema pushed via `pnpm db:push`
- `getDefaultUserId()` pre-auth shim in `src/lib/server/db/user.ts`

### Phase 2 — Core Chat & AI Streaming
- `POST /api/chat/[id]` — streams via `@ai-sdk/anthropic` (`claude-sonnet-4-6`)
- User message saved on entry; assistant message saved in `onFinish`
- Async fire-and-forget embedding via OpenAI `text-embedding-3-small` (skipped if `OPENAI_API_KEY` absent)
- Auto-title: first assistant response triggers `generateText` with `claude-haiku-4-5-20251001`
- `Chat` class + `DefaultChatTransport` from `@ai-sdk/svelte` / `ai` — **not** the old `useChat` hook
- `MessageComposer.svelte` supports Enter-to-submit, stop generation, and `.md` / `.txt` file drop via `FileReader`
- AI markdown rendered via `marked` + `highlight.js`, including per-block copy buttons

### Phase 3 — State Management & Organization
- `src/lib/state/app.svelte.ts` — single reactive class with `$state` runes
- Optimistic UI for all CRUD: create/rename/delete chat + folder, each with rollback + `toast.error`
- REST API in current use: `POST /api/chats`, `GET/PATCH/DELETE /api/chats/[id]`, `GET /api/chats/[id]/messages`, `POST /api/folders`, `PATCH/DELETE /api/folders/[id]`
- Layout: `+layout.server.ts` loads all chats + folders on initial page request
- Sidebar: `ChatHistory.svelte`, `ChatFolder.svelte` (inline rename/delete), `NewChat.svelte`, `NewFolder.svelte`

### Phase 4 — Knowledge Extraction
- `POST /api/notes`, `GET /api/notes?chatId=`, `PATCH /api/notes/[id]`, `DELETE /api/notes/[id]`
- `POST /api/highlights`, `DELETE /api/highlights/[id]`, `GET /api/chats/[id]/highlights`
- `SecondaryPanel.svelte` — Notes / Highlights / Search tabs (toggled from chat header buttons)
- `NotesTab.svelte` — textarea with 1-second debounce auto-save
- `HighlightsTab.svelte` — yellow cards, delete button
- Text-selection popover: `onmouseup` on assistant bubbles → `window.getSelection()` → fixed "Save Highlight" button
- Saved highlights are re-rendered inside assistant messages with `<mark>` styling in the chat view
- `dbMessageMap` in chat page maps SDK message IDs → DB IDs (refreshed after each stream via `GET /api/chats/[id]/messages`)

### Phase 5 — Semantic Search & `@` Mentions
- `POST /api/search` — OpenAI embedding for query + pgvector cosine distance (`<=>`), returns `{ messageId, chatId, chatTitle, content, role, score }[]`
- `SearchTab.svelte` — debounced search input, result cards with click-to-navigate
- `app.search(query)` — updates `app.searchResults` state
- `MessageComposer.svelte` — `@` keystroke detection → floating dropdown of matching `app.chats` → selection inserts a literal `@ChatTitle` reference into the textarea
- Mention-based context retrieval / prompt injection is still pending; the current implementation does not resolve `@` references before sending

---

## 🔑 Key Architecture Decisions

| Decision | What we chose | Why |
|---|---|---|
| IDs | `@paralleldrive/cuid2` | Short, URL-safe, client-side safe for optimistic UI |
| LLM | Anthropic (`claude-sonnet-4-6`) | Better quality; `claude-haiku` for cheap auto-title |
| Embeddings | OpenAI `text-embedding-3-small` | Best cost/quality for 1536-dim vectors; optional |
| State | Svelte 5 `$state` class | No extra store boilerplate; runes are reactive by default |
| Runes rule | Files must be `.svelte.ts` | Plain `.ts` files cause `rune_outside_svelte` SSR error |
| Env vars | Required: `$env/static/private`; Optional: `$env/dynamic/private` | Static throws build error if missing — use only for required keys |
| DB migrations | `pnpm db:push` (drizzle-kit) | For schema adds, use Neon MCP `run_sql` for targeted `ALTER TABLE` |
| Auth | Pre-auth shim (`getDefaultUserId`) | Single default user; real auth planned for Phase 6 |

---

## 🗂️ Key File Map

```
src/
├── lib/
│   ├── server/
│   │   ├── db/
│   │   │   ├── schema.ts          ← Drizzle schema (all tables + types)
│   │   │   ├── index.ts           ← DB client (postgres + drizzle)
│   │   │   └── user.ts            ← getDefaultUserId() pre-auth shim
│   ├── state/
│   │   └── app.svelte.ts          ← Global reactive state class
│   ├── stores/
│   │   └── toast.store.svelte.ts  ← Toast notifications (must be .svelte.ts)
│   └── components/
│       ├── layout/
│       │   ├── MessageComposer.svelte  ← Textarea + @ mention dropdown
│       │   ├── SecondaryPanel.svelte   ← Notes/Highlights/Search tabs
│       │   ├── Header.svelte
│       │   ├── Sidebar.svelte
│       │   └── Main.svelte
│       ├── menu/
│       │   ├── ChatHistory.svelte      ← Per-chat item with rename/delete
│       │   ├── ChatFolder.svelte       ← Folder with inline rename/delete
│       │   ├── NewChat.svelte
│       │   └── NewFolder.svelte
│       └── secondary/
│           ├── NotesTab.svelte         ← Debounce auto-save textarea
│           ├── HighlightsTab.svelte    ← Yellow cards + delete
│           └── SearchTab.svelte        ← Semantic search input + results
├── routes/
│   ├── +layout.server.ts           ← Loads chats + folders on startup
│   ├── +layout.svelte              ← 3-col CSS grid (sidebar/content/secondary)
│   ├── chat/[id]/
│   │   ├── +page.server.ts         ← Loads messages for active chat
│   │   └── +page.svelte            ← Chat view, streaming, highlight popover
│   └── api/
│       ├── chat/[id]/+server.ts    ← POST: stream AI, save messages, embed
│       ├── chats/+server.ts        ← POST: create chat
│       ├── chats/[id]/+server.ts   ← GET, PATCH, DELETE
│       ├── chats/[id]/messages/+server.ts  ← GET: all messages
│       ├── chats/[id]/highlights/+server.ts ← GET: highlights for chat
│       ├── folders/+server.ts      ← POST: create folder
│       ├── folders/[id]/+server.ts ← PATCH, DELETE
│       ├── notes/+server.ts        ← POST, GET?chatId=
│       ├── notes/[id]/+server.ts   ← PATCH, DELETE
│       ├── highlights/+server.ts   ← POST (validates messageId)
│       ├── highlights/[id]/+server.ts ← DELETE
│       └── search/+server.ts       ← POST: semantic search
src/tests/                          ← Vitest integration tests
e2e/                                ← Playwright E2E tests
```

---

## ⏳ What's Next — Phase 6: Polish & Deployment

### Remaining from earlier phases:
- [ ] Drag-and-drop chats into folders (`svelte-dnd-action` already installed)
- [ ] Clone & Truncate: `POST /api/chats/[id]/clone` — SQL `INSERT INTO ... SELECT`
- [ ] Destructive regeneration: edit past message → confirm modal → truncate + re-stream
- [ ] KaTeX / Mermaid rendering (currently only `marked` for basic markdown)
- [ ] Mention-based context injection beyond literal `@ChatTitle` insertion

### Phase 6 proper:
- [ ] Auth.js OAuth (GitHub/Google) — replace `getDefaultUserId()` shim
- [ ] Add `userId` tenant isolation to every DB query
- [ ] Mobile responsiveness — sidebar reopen / hamburger flow and header polish
- [ ] Error boundaries polish + production-grade Toast UX
- [ ] Deploy to Vercel (adapter-vercel already installed)

---

## 🧪 Test Commands

```bash
pnpm dev                   # Start dev server (required for integration tests)
pnpm test                  # Vitest integration tests (hits localhost:5173)
pnpm test:e2e              # Playwright E2E tests + screenshots in e2e/screenshots/
pnpm db:push               # Push schema changes to Neon
pnpm db:studio             # Open Drizzle Studio (DB browser)
```
