## 1. State Management (Svelte 5 Runes)
The entire application state is managed by a single reactive class (`src/lib/state/app.svelte.ts`).
*   **Optimistic UI:** Every CRUD operation generates a `cuid2` on the client, updates the `$state` arrays instantly, and rolls back if the background network request fails.
*   **Error Handling:** Failed optimistic updates trigger a global Toast notification.
*   **File Extension Rule:** Any TypeScript file utilizing Svelte 5 runes (`$state`, `$derived`) outside of a `.svelte` component *must* use the `.svelte.ts` extension to prevent SSR compilation errors.

## 2. UI Layout & Composition
CSS Grid ensures the Composer stays fixed at the bottom while the chat scrolls.
```text
┌─────────────────────────────────────────────────────────────────┐
│ SIDEBAR        │        MAIN CHAT AREA           │  SECONDARY   │
│ (Folders/Chats)│  ┌──────────────────────────┐   │  PANEL       │
│                │  │ User: Hello              │   │ (Notes,      │
│                │  │ AI: Hi! [highlighted]    │   │  Highlights, │
│                │  └──────────────────────────┘   │  Search)     │
│                │  ┌──────────────────────────┐   │              │
│                │  │ [@Chat-123] Type...  [↑] │   │              │
│                │  └──────────────────────────┘   │              │
└────────────────┴─────────────────────────────────┴──────────────┘
```

## 3. Core Components & Rendering
*   **Rich Content (Markdown):** AI responses are parsed via `marked` with a **custom `renderer.code`** that:
    *   Calls `hljs.highlight()` directly to syntax-highlight code blocks (do **not** also add the `markedHighlight` plugin — it pre-modifies `token.text` to HTML before the renderer runs, causing double-processing that renders raw `<span>` tags as escaped text).
    *   Wraps the result in a `div.code-block.group` with a hover-revealed "Copy" button (event-delegated via `onclick` on the chat container).
    *   Inline and block mathematics via KaTeX (planned).
    *   Diagrams via Mermaid.js (planned).
*   **The `dbMessageMap`:** Because the Vercel AI SDK generates ephemeral client-side IDs during streaming, the chat page must maintain a mapping of `Client_ID -> DB_CUID2`. This map is refreshed after every stream completes so that Highlights can be saved against the correct database row.

## 4. UX Interaction Patterns
*   **Highlight Anchoring:** Highlights are saved as raw text strings, not DOM offsets (`startOffset`/`endOffset`). The UI visually highlights text by string-matching the saved highlight against the rendered markdown.
*   **Context Injection (`@` Mentions):** 
    *   Typing `@` opens a floating dropdown filtered against `app.chats`.
    *   Selecting an item inserts `@ChatTitle` into the textarea.
    *   On submit, the frontend fetches the *full raw text* of the referenced chat from local state, wraps it in `<context>` tags, and prepends it to the prompt payload.
*   **Notes Auto-Save:** The markdown editor in the Secondary Panel uses a 1-second debounce to auto-save to the database.
*   **Clone up to here:** Each message row renders a hover-revealed "Clone up to here" button (DaisyUI `group` + `opacity-0 group-hover:opacity-100`). The button is only mounted when `dbMessageMap.has(message.id)` — ensuring the DB CUID2 is resolved before the action is available. On click, calls `POST /api/chats/[id]/clone` then navigates to the new chat.
*   **Destructive Regeneration:** User bubbles render a hover-revealed "Edit" button (same `dbMessageMap` guard). Clicking switches the bubble to an inline `<textarea>` (edit-in-place). On confirm: (1) calls `DELETE /api/chats/[id]/messages/after` with `inclusive:true` to truncate the DB; (2) directly reassigns `chatInstance = new Chat({ messages: kept })` — a synchronous `$state` mutation that bypasses SvelteKit's data pipeline entirely; (3) calls `chatInstance.sendMessage({ text: draft })` after `tick()` so Svelte flushes effects before streaming begins. Cancel returns to the original bubble without any network call.
*   **Streaming Indicators:** Uses DaisyUI `loading-dots` while `chatInstance.status` is active.

## 5. Smart Input & Quality of Life
*   **Keyboard Shortcuts:** `Ctrl/Cmd + Enter` submits the prompt. `Shift + Enter` creates a new line. `Escape` closes modals/dropdowns.
*   **Local File Drop:** Dragging a `.txt`, `.md`, or `.json` file into the composer does *not* upload it to a server. Instead, the browser's `FileReader` API extracts the text in-memory and appends it directly to the textarea.
```