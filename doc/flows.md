# Feature Flows — Sequence Diagrams

## Highlight Feature

Three sub-flows: **Load**, **Save**, and **Delete**.

---

### 1. Load highlights on chat navigation

Triggered by the `$effect` in `+page.svelte` that watches `chatId`.

```mermaid
sequenceDiagram
    participant Browser
    participant PageEffect as $effect (chatId watcher)<br/>+page.svelte
    participant AppState as app.svelte.ts<br/>(loadChatKnowledge)
    participant HighlightsAPI as GET /api/chats/[id]/highlights
    participant DB as PostgreSQL<br/>(messages + highlights)

    Browser->>PageEffect: navigates to /chat/[id]
    PageEffect->>AppState: app.loadChatKnowledge(chatId)
    AppState->>HighlightsAPI: fetch (parallel with /api/notes)
    HighlightsAPI->>DB: SELECT messages.id WHERE chatId
    DB-->>HighlightsAPI: messageIds[]
    HighlightsAPI->>DB: SELECT * FROM highlights WHERE messageId IN (...)
    DB-->>HighlightsAPI: Highlight[]
    HighlightsAPI-->>AppState: 200 JSON Highlight[]
    AppState->>AppState: this.highlights = Highlight[]
    AppState-->>Browser: $state update → HighlightsTab re-renders<br/>renderMessage() injects <mark> tags into bubbles
```

---

### 2. Save a highlight (text selection → popover → confirm)

```mermaid
sequenceDiagram
    participant User
    participant Bubble as message-bubble div<br/>(onmouseup)
    participant PageState as +page.svelte $state<br/>(popover, dbMessageMap)
    participant AppState as app.svelte.ts<br/>(saveHighlight)
    participant HighlightsAPI as POST /api/highlights
    participant DB as PostgreSQL

    User->>Bubble: selects text in assistant bubble (mouseup)
    Bubble->>PageState: handleSelectionChange(message.id)
    Note over PageState: window.getSelection().toString()<br/>Guards: text.length ≥ 3<br/>Resolves SDK id → DB id via dbMessageMap
    PageState->>PageState: popover = { x, y, text, messageId: dbId }
    PageState-->>User: floating "Save Highlight" button appears

    User->>PageState: clicks Save Highlight button
    PageState->>AppState: app.saveHighlight(messageId, text)
    AppState->>HighlightsAPI: POST { messageId, text }
    HighlightsAPI->>HighlightsAPI: requireUserId() — 401 if unauth
    HighlightsAPI->>DB: SELECT messages WHERE id = messageId
    DB-->>HighlightsAPI: message row (or 404)
    HighlightsAPI->>DB: INSERT INTO highlights (messageId, text)
    DB-->>HighlightsAPI: Highlight row (CUID2 id)
    HighlightsAPI-->>AppState: 201 JSON Highlight
    AppState->>AppState: this.highlights.push(highlight)<br/>toast.success("Highlight saved")
    AppState-->>User: $state update → HighlightsTab shows new card<br/>renderMessage() wraps text in <mark> immediately
    PageState->>PageState: popover = null<br/>window.getSelection().removeAllRanges()
```

---

### 3. Delete a highlight (optimistic)

```mermaid
sequenceDiagram
    participant User
    participant HighlightsTab as HighlightsTab.svelte
    participant AppState as app.svelte.ts<br/>(deleteHighlight)
    participant HighlightsAPI as DELETE /api/highlights/[id]
    participant DB as PostgreSQL

    User->>HighlightsTab: clicks ✕ on a highlight card
    HighlightsTab->>AppState: app.deleteHighlight(id)
    AppState->>AppState: snapshot = [...this.highlights]
    AppState->>AppState: this.highlights = highlights.filter(h => h.id !== id)
    Note over AppState: Optimistic removal — UI updates instantly
    AppState-->>User: card disappears, <mark> removed from bubble

    AppState->>HighlightsAPI: DELETE /api/highlights/[id]
    HighlightsAPI->>HighlightsAPI: requireUserId() — 401 if unauth
    HighlightsAPI->>DB: DELETE FROM highlights WHERE id = ?
    DB-->>HighlightsAPI: 204 No Content

    alt success
        HighlightsAPI-->>AppState: 204
        Note over AppState: no-op, optimistic state is correct
    else failure
        HighlightsAPI-->>AppState: 4xx/5xx
        AppState->>AppState: this.highlights = snapshot (rollback)
        AppState-->>User: card reappears, toast.error shown
    end
```

---

### Key implementation details

| Concern | Detail |
|---|---|
| SDK id → DB id | `dbMessageMap: Map<sdkId, dbId>` is built after streaming ends by aligning SDK messages with DB rows by index + role. `handleSelectionChange` resolves the DB id before building the `popover` object. |
| `<mark>` injection | `renderMessage()` first runs `marked.parse()` then does a global regex replace over the rendered HTML for each saved highlight text. Order matters: Markdown is rendered first, highlights overlaid second. |
| No note field in UI | The `highlights` DB table has an optional `note` column; the current UI sends only `{ messageId, text }` — `note` defaults to `null`. |
| Cascade delete | `highlights.messageId` has `onDelete: 'cascade'` — deleting a message automatically removes its highlights. |
| Auth join via messages | `GET /api/chats/[id]/highlights` has no direct `userId` column on highlights. Auth is enforced by fetching only message IDs that belong to the given chat, implicitly scoped by the chat ownership check upstream. |
