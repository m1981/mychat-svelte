**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)

**Document:** Product Vision & Core Requirements

**Version:** 1.0 (Lean V1)

---

## 1. Executive Summary & Product Vision
Standard AI chat interfaces treat conversations as ephemeral, disposable interactions. Users generate thousands of words of valuable insights, code, and research, only for it to be lost in a noisy, unorganized sidebar. 

**The Vision:** BetterChatGPT bridges the gap between an AI Chatbot and a Personal Knowledge Management (PKM) system (like Notion or Obsidian). It is designed for power users who need to not just *generate* text, but **extract, organize, and reuse** that knowledge efficiently.

## 2. Target Audience & Core Motivations
*   **The Persona:** Developers, researchers, writers, and power users who use LLMs daily for complex problem-solving.
*   **The Pain Points:**
    *   *The "Needle in a Haystack":* Finding a specific 50-word insight inside a 3,000-word chat history is frustrating.
    *   *The "Context Tax":* Manually copy-pasting context from old chats into new prompts is tedious.
    *   *The "Messy Sidebar":* A flat list of 200 chats becomes unnavigable after a month.
    *   *Fear of Ruining Context:* Users are afraid to ask a tangential question in a good chat because it might "poison" the AI's context window.

---

## 3. Core Feature Specifications

### 3.1. Knowledge Extraction (Highlights & Notes)
*   **Motivation:** AI output is 80% noise and 20% signal. Users need a way to save the signal without losing the context of how it was generated.
*   **Requirements:**
    *   **Highlights:** Users can select any text within an AI's response and save it as a "Highlight" (visually marked in the UI).
    *   **Scratchpad Notes:** Users can attach markdown-supported notes to a specific chat or a specific highlight (e.g., "Summary," "Todo," "Scratch").
    *   **Secondary Panel:** A dedicated UI panel alongside the chat that aggregates all highlights and notes for the active conversation.

### 3.2. Conversation Branching (Clone & Truncate)
*   **Motivation:** Users need to explore alternate conversation paths or fix a bad prompt without losing their existing, working chat history.
*   **Requirements:**
    *   **Clone Up To Here:** Every message has a "Clone" action button. Clicking it creates a completely new Chat (e.g., "Original Title (Copy)") containing all messages from the start up to the selected message.
    *   **Edit & Re-generate:** Users can edit any past message in a chat. Submitting the edit triggers a warning: *"This will delete all subsequent messages."* Upon confirmation, the chat is truncated, and the AI generates a new response from that point forward.

### 3.3. Organization: One-Level Folders & Tags
*   **Motivation:** Users need to group related workflows without the cognitive overload and UI lag of infinitely nested file trees.
*   **Requirements:**
    *   **One-Level Folders:** A flat folder structure. Folders can contain Chats, but not other Folders. 
    *   **Drag-and-Drop:** Users can drag chats into folders easily.
    *   **JSONB Tags:** Chats and Notes can be tagged (e.g., `#urgent`, `#code`). Tags act as a cross-cutting organizational tool.

### 3.4. Context Injection (`@` Mentions)
*   **Motivation:** Seamlessly chaining thoughts together without manual copy-pasting.
*   **Requirements:**
    *   Typing `@` in the message composer opens a lightweight popover menu to search past Chats, Notes, or Highlights.
    *   *Lean Implementation:* The frontend intercepts the selection, fetches the referenced text, and invisibly prepends it to the system prompt before sending it to the AI.

### 3.5. Multi-Model Support
*   **Motivation:** Different tasks require different models (e.g., Claude 3.5 Sonnet for coding, GPT-4o for general reasoning).
*   **Requirements:**
    *   Users can select the AI provider/model on a per-chat basis.
    *   Powered by the Vercel AI SDK to normalize streaming across providers.

### 3.6. Semantic Search
*   **Motivation:** Keyword search fails when you remember the *concept* but not the exact *words* the AI used.
*   **Requirements:**
    *   Global search bar that queries across all Chats, Notes, and Highlights.
    *   Uses `pgvector` embeddings (generated synchronously on message creation) to return conceptually similar results.

---

## 4. Key User Workflows

**Workflow A: The Safe Refactor (Using Clone)**
1. User has a 20-message chat where the AI successfully wrote a Python script.
2. User wants to see if the AI can rewrite it in Rust, but doesn't want to ruin the Python context.
3. User clicks "Clone up to here" on the last good message.
4. A new chat opens. User types: *"Actually, rewrite all of that in Rust."*
5. The original Python chat remains perfectly intact.

---

## 5. Out of Scope for V1 (The "YAGNI" Parking Lot)
*   **Nested Folders:** (Restricted to one-level to keep drag-and-drop state management simple).
*   **Inline Message Trees:** (Replaced by the simpler "Clone & Truncate" feature).
*   **Cloud File Hosting (S3):** (Attachments will be parsed for text in-memory and discarded).
*   **Background Job Queues:** (Embeddings will be handled synchronously with strict text-length limits).