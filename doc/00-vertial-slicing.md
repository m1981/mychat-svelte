> **Status as of 2026-03-09: All tracks complete through Phase 5**

### Step 1: The "Day Zero" Requirement (Contract-First)
Before anyone writes a line of feature code, the Lead Developer must lock in two files and merge them to the `main` branch:
1.  **`schema.ts` (The Database Contract):** Everyone needs to know exactly what the data looks like.
2.  **`app.svelte.ts` (The State Contract):** The empty Svelte 5 class with all the arrays (`chats`, `notes`, `highlights`) defined, even if they do nothing yet.

Once these two files are merged, the team can split into parallel tracks.

---

### Approach A: Vertical Slicing (Feature Squads) - *Recommended*
Instead of splitting by Frontend/Backend, we split by **Feature Domains**. Each developer (or pair) builds their feature from the database up to the UI.

#### ✅ Track 1: The Core Chat Engine — COMPLETE (2026-03-09)
*   **Focus:** Getting the AI to talk to the user.
*   **Scope:** `chats` and `messages` tables, Vercel AI SDK integration, `MessageComposer.svelte`, and `ChatView.svelte`.
*   **Delivered:**
    - Full DB persistence for chats and folders (all CRUD with optimistic UI + rollback)
    - Streaming via Anthropic `claude-sonnet-4-6` (`@ai-sdk/anthropic`)
    - `app.svelte.ts` global state class with `$state` runes
    - `ChatHistory.svelte` + `ChatFolder.svelte` wired to real API
    - Pre-auth `getDefaultUserId()` shim in `src/lib/server/db/user.ts`
    - Auto-title after first AI exchange via `claude-haiku-4-5-20251001`
*   **Pending (bonus):** Drag-and-drop into folders.

#### ✅ Track 2: Knowledge Extraction — COMPLETE (2026-03-09)
*   **Focus:** Highlights and Notes.
*   **Scope:** `notes` and `highlights` tables, `/api/notes` and `/api/highlights` endpoints, `SecondaryPanel.svelte`, and the text-selection logic in `MessageItem.svelte`.
*   **Delivered:**
    - `SecondaryPanel.svelte` with Notes and Highlights tabs
    - Full REST API: `POST /api/notes`, `PATCH /api/notes/[id]`, `DELETE /api/notes/[id]`
    - Full REST API: `POST /api/highlights`, `DELETE /api/highlights/[id]`, `GET /api/chats/[id]/highlights`
    - Text-selection popover for in-message highlight creation
    - `dbMessageMap` for mapping Vercel AI SDK message IDs to DB row IDs

#### ✅ Track 3: Organization & Search — COMPLETE (2026-03-09)
*   **Focus:** Finding and organizing things.
*   **Scope:** `folders` table, sidebar folder management, and `pgvector` semantic search endpoint.
*   **Delivered:**
    - Folders CRUD: `POST /api/folders`, `PATCH /api/folders/[id]`, `DELETE /api/folders/[id]`
    - Semantic search via `POST /api/search` using OpenAI `text-embedding-3-small` and pgvector cosine distance
    - Graceful degradation when `OPENAI_API_KEY` is absent (falls back to keyword search or empty results)
    - `SearchTab` component integrated into `SecondaryPanel.svelte`
    - `@mention` dropdown in `MessageComposer` for referencing chats/notes inline

**Why this worked:** Because the database schema was locked upfront, all three tracks touched completely different UI components and API routes. When merged, the app came together with minimal conflicts.

---

### The Lead Developer's "Secret Weapons" for Isolation

To ensure these tracks actually stay isolated, the Lead Developer enforces three technical practices:

1.  **Database Branching (e.g., Neon or Supabase):**
    Every developer gets their own isolated branch of the PostgreSQL database. If a developer accidentally drops a table while testing their feature, it doesn't break anyone else's local environment.
2.  **Mocking the AI (Cost & Speed):**
    Devs building the UI shouldn't be hitting the real Anthropic API (it costs money and is slow). The Lead Dev sets up the Vercel AI SDK to use a `MockProvider` locally that instantly streams back *"Lorem ipsum..."* so UI development is lightning fast.
3.  **Feature Flags:**
    If a backend is finished but the UI isn't ready, merge it to `main` hidden behind a simple boolean: `if (env.ENABLE_NOTES) { render SecondaryPanel }`. This prevents long-lived feature branches that cause nightmare merge conflicts.

### Summary for BetterChatGPT
If I were leading this project, I would use **Vertical Slicing**.
*   I would put my strongest full-stack dev on **Track 1 (Core Chat & AI)** because the Vercel AI SDK streaming is the most critical path.
*   I would put a UI-heavy dev on **Track 2 (Extraction)** because calculating DOM text offsets for highlights is tricky frontend work.
*   I would put a data-heavy dev on **Track 3 (Search)** because tuning `pgvector` cosine similarity requires good SQL knowledge.
