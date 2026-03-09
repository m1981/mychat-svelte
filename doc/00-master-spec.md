# 📘 BetterChatGPT: Master Agile Specification
**Version:** 2.0 (Agile Refactor) | **Team Size:** 4 Developers

## 1. Product Vision & The "YAGNI" Parking Lot
**The Vision:** BetterChatGPT bridges the gap between an AI Chatbot and a Personal Knowledge Management (PKM) system. It allows power users to extract, organize, branch, and reuse AI-generated knowledge efficiently within a highly polished, keyboard-first UI.

**The YAGNI Parking Lot (Out of Scope for V1):**
To maintain velocity, the team explicitly agrees **NOT** to build:
*   Token Counting & Cost Estimation.
*   Advanced LLM Sliders (Temperature, Top P).
*   Cloud File Hosting (S3) - *Files are parsed in-memory only.*
*   Nested Folders - *Strictly one-level deep.*
*   Inline Message Trees - *Replaced by the simpler "Clone & Truncate" feature.*
*   Background Job Queues - *Embeddings are handled synchronously.*
*   Bring Your Own Key (BYOK) or i18n.

---

## 2. Ubiquitous Language & Architecture

### 2.1. Domain Glossary
*   **Chat:** A linear sequence of messages. The primary container.
*   **Message:** A single turn (`user`, `assistant`, or `system`).
*   **Folder:** A flat organizational container for Chats.
*   **Highlight:** A specific text string extracted from an AI's Message.
*   **Note (Scratchpad):** A user-authored markdown document attached to a Chat.
*   **Clone (Forking):** Duplicating a Chat up to a specific Message to explore an alternate path.
*   **Context Injection (`@` Mention):** Frontend mechanism prepending referenced text to a prompt.
*   **Embedding:** A 1536-dimensional vector representation of a Message's text.

### 2.2. Architectural Constraints
*   **Tech Stack:** SvelteKit v5 (Runes for global state), Drizzle ORM, PostgreSQL + `pgvector`, Vercel AI SDK.
*   **State Management:** Global state managed via Svelte 5 `$state` classes. **Rule:** All UI updates (creating folders, sending messages) must be *Optimistic* (update DOM instantly using client-generated `cuid2` IDs, then fetch in background).
*   **Auth/Tenant Isolation:** OAuth via Auth.js. **Rule:** Every single DB query must include `where: eq(table.userId, currentUserId)`.
*   **UI Layout:** CSS Grid ensuring the Composer stays fixed at the bottom.
    ```text
    ┌─────────────────────────────────────────────────────────────────┐
    │ SIDEBAR        │        MAIN CHAT AREA           │  SECONDARY   │
    │ (Folders/Chats)│  ┌──────────────────────────┐   │  PANEL       │
    │                │  │ User: Hello              │   │ (Notes &     │
    │                │  │ AI: Hi! [highlighted]    │   │  Highlights) │
    │                │  └──────────────────────────┘   │              │
    │                │  ┌──────────────────────────┐   │              │
    │                │  │ [@Chat-123] Type...  [↑] │   │              │
    │                │  └──────────────────────────┘   │              │
    └────────────────┴─────────────────────────────────┴──────────────┘
    ```

---

## 3. The Product Backlog (Vertical Slices)

*Note for the team: Each Sprint represents a fully functional vertical slice of the application (UI + API + Database).*

### 🟢 Sprint 1: The Core Chat Loop
**Goal:** A user can log in, send a message, see the AI stream a response, and have it saved to the database.

*   **Story 1.1: AI Streaming & Persistence**
    *   *Logic:* Use Vercel AI SDK `useChat`. Generate `cuid2` on the client. Save user message on submit, save AI message on `onFinish`.
    *   *Given* a user is in a new chat
    *   *When* they submit a prompt
    *   *Then* the UI displays a typewriter effect as chunks arrive via HTTP SSE
    *   *And* the UI auto-scrolls to the bottom
    *   *And* both messages are persisted to the PostgreSQL database.
*   **Story 1.2: Auto-Title Generation**
    *   *Logic:* Triggered asynchronously after the *first* AI response completes using a fast model (`gpt-4o-mini`).
    *   *Given* a chat is currently named "New Chat"
    *   *When* the first AI response finishes streaming
    *   *Then* the system generates a 3-5 word summary
    *   *And* the chat title updates in the UI and database.

### 🟡 Sprint 2: Branching & Organization
**Goal:** Users can organize their chats and safely explore alternate prompt paths without losing history.

*   **Story 2.1: Flat Folders**
    *   *Logic:* Folders are 1-level deep. Deleting a folder does not delete the chats (removes `folderId`).
    *   *Given* a user has unorganized chats
    *   *When* they create a folder and drag a chat into it
    *   *Then* the UI updates optimistically
    *   *And* the database updates the chat's `folderId`.
*   **Story 2.2: Clone & Truncate (Branching)**
    *   *Logic:* Backend uses `INSERT INTO messages ... SELECT` to duplicate vectors instantly. Notes/Highlights are *not* cloned.
    *   *Given* a user is viewing a 10-message chat
    *   *When* they click "Clone up to here" on Message 5
    *   *Then* a new chat is created titled "[Original] (Copy)"
    *   *And* the new chat contains exact copies of Messages 1 through 5
    *   *And* the user is redirected to the new chat.
*   **Story 2.3: Destructive Regeneration**
    *   *Given* a user edits Message 3 in a 5-message chat
    *   *When* they click "Regenerate"
    *   *Then* a warning modal appears stating subsequent messages will be deleted
    *   *And* upon confirmation, Messages 4 and 5 are deleted from the DB, and a new AI response streams.

### 🟠 Sprint 3: Knowledge Extraction
**Goal:** Users can extract signal from the noise using Highlights and Notes.

*   **Story 3.1: Text Highlighting**
    *   *Logic:* Frontend calculates `startOffset`/`endOffset` relative to raw markdown.
    *   *Given* an AI response is rendered on screen
    *   *When* the user selects text with their mouse and clicks "Save Highlight"
    *   *Then* the text is visually highlighted in the chat
    *   *And* the snippet appears in the Secondary Panel linked to that `messageId`.
*   **Story 3.2: Chat Scratchpad (Notes)**
    *   *Logic:* Auto-saves to DB 1 second after typing stops (debounce).
    *   *Given* the Secondary Panel is open to the "Notes" tab
    *   *When* the user types markdown into the editor
    *   *Then* the note is auto-saved to the database attached to the `activeChatId`.

### 🔴 Sprint 4: Power Tools & Rich UX
**Goal:** Keyboard shortcuts, rich rendering, and semantic search.

*   **Story 4.1: Rich Content Rendering**
    *   *Given* the AI returns markdown containing code, LaTeX, or Mermaid syntax
    *   *Then* code blocks render with syntax highlighting and a "Copy" button
    *   *And* LaTeX renders via KaTeX
    *   *And* Mermaid blocks render as SVG diagrams.
*   **Story 4.2: Local File Drop**
    *   *Logic:* Files are never uploaded. `FileReader` extracts text and formats it into the prompt.
    *   *Given* a user drags a `.txt` or `.md` file into the composer
    *   *When* the file is dropped
    *   *Then* the file's text contents are appended to the textarea.
*   **Story 4.3: Context Injection (`@` Mentions)**
    *   *Logic:* API remains dumb. Frontend intercepts `@`, fetches text from local state, and wraps in `<context>` tags before sending.
    *   *Given* a user types `@` in the composer
    *   *When* they select a past Chat or Note from the popover
    *   *Then* the referenced text is invisibly prepended to the prompt payload sent to the AI.
*   **Story 4.4: Semantic Search**
    *   *Logic:* `onFinish` synchronously generates a `text-embedding-3-small` vector. Search uses `pgvector` cosine similarity.
    *   *Given* a user searches for a concept (e.g., "frontend routing")
    *   *When* they submit the search
    *   *Then* the system returns messages conceptually related to the query, even if exact keywords don't match.