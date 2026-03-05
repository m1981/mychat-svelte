# Data Layer & Persistence

## 1. Data Model (The "Truth")
Defined in `src/lib/server/db/schema.ts` and inferred in `models.ts`.
*   **users:** `id`, `email`, `createdAt`
*   **folders:** `id`, `userId`, `name`, `parentId`, `order`, `color`
*   **chats:** `id`, `userId`, `folderId`, `title`, `config` (JSONB), `metadata` (JSONB)
*   **messages:** `id`, `chatId`, `role`, `content`
*   **Feature Tables:** `notes`, `highlights`, `attachments`, `tags` (with junction tables for many-to-many relations).

## 2. Repository Interface (Async Ports)
*   Drizzle ORM acts as the repository layer.
*   Queries utilize Drizzle's Relational Queries (`db.query.chats.findMany`) for read operations and standard SQL builders (`db.insert().onConflictDoUpdate()`) for writes.

## 3. Database Procedures & Logic
*   **Cascading Deletes:** Deleting a Chat automatically deletes all associated Messages, Notes, and Attachments via foreign key `onDelete: 'cascade'`.
*   **JSONB Strict Typing:** `config` and `metadata` columns use Drizzle's `.$type<T>()` to enforce TypeScript interfaces at the database boundary.

## 4. Infrastructure Specifics
*   **Dialect:** PostgreSQL.
*   **Migrations:** Managed via `drizzle-kit` (`db:generate`, `db:migrate`).