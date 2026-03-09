# mychat-svelte Project Context

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
- `src/lib/server/db/user.ts` — getDefaultUserId() pre-auth shim
- `src/lib/state/app.svelte.ts` — Global reactive state (Svelte 5 runes), optimistic updates
- `src/lib/stores/toast.store.svelte.ts` — Toast notifications (must be .svelte.ts)
- `src/routes/+layout.server.ts` — Loads chats/folders on startup
- `src/routes/api/chat/[id]/+server.ts` — AI streaming (Anthropic), save messages, async embedding
- `drizzle.config.ts` — DB migrations, requires DATABASE_URL env var

## Architecture
- State: Svelte 5 `$state` runes with optimistic updates + rollback on failure
- No API client abstraction — components call `fetch` directly via `app.svelte.ts` methods
- API routes under `src/routes/api/`: chats, chats/[id], chats/[id]/messages, chats/[id]/highlights, folders, folders/[id], notes, notes/[id], highlights, highlights/[id], search
- LLM: Anthropic `claude-sonnet-4-6` (chat) + `claude-haiku-4-5-20251001` (auto-title); OpenAI optional for embeddings
- Auth: pre-auth, single default user (getDefaultUserId)
- Messages have vector embeddings (1536-dim, HNSW index) for semantic search
- CUID2 for all IDs

## Documentation
All specs in `/doc/`:
- `implementaion-plan.md` — quick-reference: what's built, key decisions, file map, what's next
- `05-implementation-phases.md` — authoritative phase record with checkpoints
- `00-master-spec.md`, `02-domain-and-architecture.md`, `03-functional-and-technical-specs.md`
- `04-ui-ux-and-state.md`, `00-vertial-slicing.md`
- `principles_ai_sdk.md`, `principles_useChat.md`, `principles_svelte.md`
- `principles_daisyui.md`, `principles-css.md`, `principles-playwright.md`

## Database / Migrations
- Neon project: `summer-thunder-21343395` (Azure, gwc region, `mychat`)
- **Migration script**: `pnpm db:push` — uses `drizzle-kit push --force`. But `--force` does NOT suppress column-rename prompts; for clean DB resets it's safer to drop tables via Neon MCP and then run `pnpm db:push`.
- `pgvector` extension must be enabled before pushing: `CREATE EXTENSION IF NOT EXISTS vector;`
- After schema changes, always run `pnpm db:push` (or the Neon MCP `run_sql` for targeted `ALTER TABLE`) before testing the app.

## Svelte 5 Runes Rule
- Files using `$state`/`$derived`/`$effect` must end in `.svelte`, `.svelte.ts`, or `.svelte.js` — plain `.ts` files cause `rune_outside_svelte` SSR errors.
- `toast.store.ts` was renamed to `toast.store.svelte.ts` for this reason.

## ENV vars
- Required keys: use `$env/static/private` (e.g. `ANTHROPIC_API_KEY`) — throws build error if missing, which is correct
- Optional keys: use `$env/dynamic/private` (e.g. `OPENAI_API_KEY`) — returns undefined at runtime instead of failing the build

## Workflow Preferences
- Always test after implementing: run the dev server, check for SSR errors in the vite log, run `pnpm test`, run `pnpm test:e2e`, read screenshots before declaring done.
- TDD cycle: user scenario → Vitest API tests (red) → implementation (green) → Playwright visual tests (confirmation)
