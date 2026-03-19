
## 1. Vertical Slicing Strategy
Development is split by **Feature Domains** (Vertical Slices) rather than technical layers.
*   **Track 1:** Core Chat Engine (AI Streaming, Chat/Message DB, Composer UI).
*   **Track 2:** Knowledge Extraction (Highlights, Notes, Secondary Panel).
*   **Track 3:** Organization & Search (Folders, pgvector Semantic Search).

## 2. Implementation Phases & Status

### ✅ Phase 1: Foundation & Database (COMPLETE)
*   SvelteKit v5, Tailwind v4, Drizzle ORM, PostgreSQL + `pgvector`.
*   Schema pushed, pre-auth `getDefaultUserId()` shim implemented.

### ✅ Phase 2: Core Chat & AI Streaming (COMPLETE)
*   Vercel AI SDK integration (`@ai-sdk/anthropic`).
*   `MessageComposer.svelte` and HTTP SSE streaming working.

### ✅ Phase 3: State Management & Organization (COMPLETE)
*   `app.svelte.ts` global state with optimistic UI.
*   Sidebar, Folders, and Chat CRUD fully wired to REST APIs.

### ✅ Phase 4: Knowledge Extraction (COMPLETE)
*   `SecondaryPanel.svelte` built.
*   Notes (debounced auto-save) and Highlights (string-based saving) implemented.

### ✅ Phase 5: Power Features (COMPLETE)
*   Semantic Search (`POST /api/search`) via OpenAI embeddings.
*   Context Injection (`@` mentions) UI implemented in Composer.

### 🔄 Phase 6: Polish & Branching (IN PROGRESS)
*   ✅ **Bug fix:** Removed `markedHighlight` plugin — it pre-modified token text before the custom renderer ran, causing `hljs` to double-process and render raw HTML spans as escaped text. Custom `renderer.code` handles all highlighting directly.
*   ✅ **Clone up to here:** `POST /api/chats/[id]/clone` — copies chat + messages up to a given `upToMessageId` into a new chat (title suffixed `(clone)`). Hover-revealed "Clone up to here" button on every message bubble; button gated on `dbMessageMap.has(message.id)` to prevent the race between streaming end and DB ID resolution.
*   ✅ **Destructive Regeneration:** Hover-revealed Edit button on user bubbles (gated on `dbMessageMap`). Clicking opens inline textarea; confirming calls `DELETE /api/chats/[id]/messages/after` with `inclusive:true`, directly reassigns `chatInstance = new Chat({ messages: kept })` (synchronous `$state` mutation bypassing SvelteKit data pipeline), then calls `chatInstance.sendMessage({ text: draft })` after `tick()`. 4 E2E tests green.
*   ✅ **Multi-model selection dropdown:** `<select>` in chat header bound to `currentChatMetadata.modelId`. Changing it calls `app.updateModel()` (optimistic PATCH). Streaming endpoint reads model from DB. Supported: Haiku 4.5, Sonnet 4.6 (default), Opus 4.6. Selector disabled during streaming. 3 E2E + 6 Vitest API tests green.
*   ⏳ **Auth.js integration.**