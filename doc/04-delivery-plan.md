
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

### ⏳ Phase 6: Polish & Branching (NEXT SPRINT)
*   **Pending:** "Clone up to here" (SQL-level duplication of chats).
*   **Pending:** Destructive Regeneration (Edit past message & truncate).
*   **Pending:** Multi-model selection dropdown.
*   **Pending:** Auth.js integration.