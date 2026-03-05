# System Overview & Architecture

## 1. Executive Summary
BetterChatGPT is a modern, commercial-grade AI chat interface built with SvelteKit. It supports multiple LLM providers (OpenAI, Anthropic), complex chat organization (folders, drag-and-drop), and real-time streaming responses. The system is designed for high performance, utilizing optimistic UI updates and lazy-loaded data to prevent memory bloat.

## 2. High-Level Architecture
*   **Frontend:** SvelteKit (Svelte 5), TailwindCSS v4, DaisyUI.
*   **Backend:** SvelteKit API Routes (Thin API layer).
*   **Service Layer:** Node.js services orchestrating DB and AI logic (`ChatServerService`).
*   **Database:** PostgreSQL managed via Drizzle ORM.
*   **AI Integration:** Provider pattern abstracting OpenAI and Anthropic SDKs.

## 3. Core Design Patterns
*   **Single Source of Truth (SSOT):** Domain models are inferred directly from the Drizzle ORM schema (`models.ts`).
*   **Single Responsibility Principle (SRP):** AI Providers only generate text streams. Services handle DB persistence. API routes only handle HTTP.
*   **Provider Pattern:** `getAIProvider(name)` allows seamless swapping of LLM backends without changing business logic.

## 4. State Management Strategy
*   **Global Stores:** Svelte stores (`chats`, `folders`, `toast`, `streamingService`) manage UI state.
*   **Lazy Loading:** The layout server only loads chat metadata (titles, folders) for the sidebar. Messages are fetched just-in-time when a chat is opened to prevent memory leaks.
*   **Optimistic UI:** User messages and AI placeholders are injected into the UI immediately before the server responds.

## 5. Domain Glossary (Ubiquitous Language)
*   **Chat:** A conversation thread containing messages and a specific AI configuration.
*   **Folder:** A container for organizing Chats.
*   **Message:** A single turn in a Chat (Role: user, assistant, or system).
*   **Provider:** The external AI service (e.g., OpenAI, Anthropic).
*   **Stream Interceptor:** Backend logic that passes the AI stream to the client while simultaneously accumulating the text to save to the database.