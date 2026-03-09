**Project:** BetterChatGPT (AI-Powered Personal Knowledge Management)
**Document:** Product Requirements & Domain Definitions

---

## 1. Product Vision & Target Audience
Standard AI chat interfaces treat conversations as ephemeral. **BetterChatGPT** bridges the gap between an AI Chatbot and a Personal Knowledge Management (PKM) system. It is designed for power users (developers, researchers) who need to extract, organize, branch, and reuse AI-generated knowledge efficiently within a highly polished, keyboard-first UI.

## 2. Ubiquitous Language (Domain Glossary)
To ensure clear communication, these terms have strict definitions:
*   **Chat:** A linear sequence of messages (max 15-20). The primary aggregate root.
*   **Message:** A single turn (`user`, `assistant`, or `system`).
*   **Folder:** A flat organizational container for Chats.
*   **Highlight:** A specific raw text string extracted from an AI's Message, saved for future reference.
*   **Note (Scratchpad):** A user-authored markdown document attached to a Chat.
*   **Clone (Forking):** Duplicating a Chat up to a specific Message to explore an alternate path without altering the original.
*   **Context Injection (`@` Mention):** Prepending the *full raw text* of a referenced Chat or Note to a prompt.
*   **Embedding:** A 1536-dimensional vector representation of a Message's text used for semantic search.

## 3. User Stories & Acceptance Criteria

**Epic 1: Core Chat & AI Interaction**
*   **Story:** As a user, I want to send messages and see the response stream in real-time.
*   **Story:** As a user, I want my chats to be automatically named (3-5 words) after the first AI response completes.

**Epic 2: Knowledge Extraction**
*   **Story:** As a user, I want to highlight text in an AI response and save it to a Secondary Panel.
*   **Story:** As a user, I want to write markdown notes attached to the current chat that auto-save as I type.

**Epic 3: Conversation Branching**
*   **Story:** As a user, I want to clone a chat up to a specific message so I can try a different prompt.
*   **Story:** As a user, I want to edit a past message and regenerate the response, truncating subsequent messages.

**Epic 4: Organization & Search**
*   **Story:** As a user, I want to organize chats into flat folders.
*   **Story:** As a user, I want to search my past conversations by concept (semantic search).
*   **Story:** As a user, I want to type `@` to inject the full text of past chats/notes into my current prompt.

## 4. The YAGNI Parking Lot (Out of Scope)
To maintain velocity, we explicitly will **NOT** build:
*   **Pagination/Infinite Scroll:** Chats are capped at 15-20 messages.
*   **Multi-Model Selection:** Deferred to next sprint (hardcoded to Claude 3.5 Sonnet for now).
*   **Nested Folders:** Strictly one-level deep.
*   **Inline Message Trees:** Replaced by the simpler "Clone & Truncate" feature.
*   **Cloud File Hosting (S3):** Local files are parsed in-memory only.
*   **Token Counting & Cost Estimation.**