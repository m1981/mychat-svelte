# Features & User Flows

## 1. Primary Actors & Goals
*   **User:** Wants to interact with AI models, organize conversations, and retrieve past knowledge quickly.
*   **System:** Wants to provide low-latency streaming, ensure data integrity, and manage API keys securely.

## 2. Core Features
*   **Multi-Model Chat:** Chat with Claude or GPT models.
*   **Real-time Streaming:** Typewriter-effect responses from AI.
*   **Workspace Organization:** Create folders, rename chats, and drag-and-drop chats into folders.
*   **Search:** Filter chat history by title.
*   **Resilience:** Global error boundaries and toast notifications for network/API failures.

## 3. User Flows
*   **New Chat Flow:** User clicks "New Chat" -> System generates ID -> Navigates to `/chat/[id]` -> User types prompt -> System streams response.
*   **Organization Flow:** User drags Chat A into Folder B -> `svelte-dnd-action` triggers `onfinalize` -> Store updates locally -> (Future: Syncs order/folderId to DB).
*   **Rename/Delete Flow:** User clicks edit/delete icon -> Optimistic UI update -> API call to update DB -> Toast confirmation.

## 4. UI Composition
*   **Sidebar:** Contains Search, Folders, and Chat History. Collapsible.
*   **Main Area:** Displays the active chat's messages.
*   **Composer:** Fixed bottom input area for sending prompts.