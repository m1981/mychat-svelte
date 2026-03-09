# mychat-svelte Project Memory

## Tech Stack
- **Frontend**: Svelte 5 (runes) + SvelteKit 2, TypeScript, deployed on Vercel
- **Styling**: Tailwind CSS v4 + DaisyUI v5
- **AI**: Vercel AI SDK v6 (`ai` package), Anthropic Claude + OpenAI providers
- **Database**: PostgreSQL via Drizzle ORM 0.40.0, `postgres` driver
- **Package manager**: pnpm
- **Testing**: Vitest + Playwright

## Key Files
- `src/lib/server/db/schema.ts` — Drizzle schema (users, folders, chats, messages, notes, highlights)
- `src/lib/server/db/index.ts` — DB client init
- `src/lib/server/db/user.ts` — User queries (getDefaultUserId)
- `src/lib/state/app.svelte.ts` — Global reactive state (Svelte 5 runes), optimistic updates
- `src/lib/api/client.ts` — Unused helper/prototype; not imported by the current app state/API flow
- `src/routes/+layout.server.ts` — Loads chats/folders on startup
- `drizzle.config.ts` — DB migrations, requires DATABASE_URL env var

## Architecture
- State: Svelte 5 `$state` runes with optimistic updates + rollback on failure
- Current UI CRUD/search flows call `fetch` directly inside `src/lib/state/app.svelte.ts`; `src/lib/api/client.ts` is present but not wired into the active architecture
- API: SvelteKit server routes under `src/routes/api/`
  - `/api/chats`, `/api/chats/[id]`
  - `/api/folders`, `/api/folders/[id]`
- Auth: pre-auth, single default user currently
- Messages have vector embeddings (1536-dim, HNSW index) for semantic search
- CUID2 for all IDs

## Documentation
All specs in `/doc/`:
- `00-master-spec.md`, `01-product-vision...`, `02-domain-and-architecture.md`
- `03-functional-and-technical-specs.md`, `04-ui-ux-and-state.md`, `05-implementation-phases.md`
- `principles_ai_sdk.md`, `principles_useChat.md`, `principles_svelte.md`
- `principles_daisyui.md`, `principles-css.md`, `principles_custom_twv4.md`

## Database / Migrations
- Neon project: `summer-thunder-21343395` (Azure, gwc region, `mychat`)
- **Migration script**: `pnpm db:push` — uses `drizzle-kit push --force`. But `--force` does NOT suppress column-rename prompts; for clean DB resets it's safer to drop tables via Neon MCP and then run `pnpm db:push`.
- `pgvector` extension must be enabled before pushing: `CREATE EXTENSION IF NOT EXISTS vector;`
- After schema changes, always run `pnpm db:push` (or the Neon MCP `run_sql` for targeted `ALTER TABLE`) before testing the app.

## Svelte 5 Runes Rule
- Files using `$state`/`$derived`/`$effect` must end in `.svelte`, `.svelte.ts`, or `.svelte.js` — plain `.ts` files cause `rune_outside_svelte` SSR errors.
- `toast.store.ts` was renamed to `toast.store.svelte.ts` for this reason.

## User Preferences
- Always test after implementing: run the dev server, check for SSR errors in the vite log, and hit API endpoints with curl before declaring done.
