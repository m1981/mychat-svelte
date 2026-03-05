# Core Logic & Algorithms

## 1. AI Stream Interception
To adhere to SRP and provide fast UX, the backend does not wait for the AI to finish before responding.
*   **Algorithm:** `ChatServerService.createDbInterceptingStream`
*   **Logic:** 
    1. Receive raw stream from AI Provider.
    2. Create a new `ReadableStream`.
    3. As chunks arrive, decode them, extract the text, and append to a local string variable.
    4. Pass the chunk immediately to the client.
    5. On stream `done`, asynchronously insert the accumulated string into the `messages` table.

## 2. Drag and Drop Ordering
*   **Algorithm:** Flat-list mapping for `svelte-dnd-action`.
*   **Logic:** 
    1. Derive a flat list of `DraggableItem` (mixed Folders and Chats) sorted by `order`.
    2. On drop (`handleDndFinalize`), iterate through the new list.
    3. Track the `currentFolderId`. If a chat appears after a folder, assign it that `folderId`.
    4. Update the Svelte stores with the new structure.

## 3. Error Classification
*   **Algorithm:** `classifyError` in `error-handler.ts`.
*   **Logic:** Maps raw exceptions (TypeErrors, API failures) to standard `ErrorType` enums (NETWORK, VALIDATION, SERVER) to display user-friendly toast messages.