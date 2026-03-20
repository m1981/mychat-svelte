# Project Insights & Discoveries

A running log of non-obvious findings, bugs, and design decisions made during development.

---

## Svelte 5 / SvelteKit

### Direct `$state` mutation vs. `$effect` for reactive resets
When you need to reset reactive state synchronously in response to a user action (e.g. swapping out a `chatInstance`), do it with a direct assignment in the async event handler — **not** inside a `$effect`. Two-effect approaches have ordering bugs: the navigation effect may re-run after your reset effect and overwrite it. Direct reassignment in a function is immediate and predictable.

### `tick()` after `$state` mutation before calling SDK methods
After reassigning `$state` variables that Svelte components depend on, call `await tick()` before triggering downstream SDK calls (e.g. `chatInstance.sendMessage()`). Without `tick()`, pending effects haven't flushed and the new `chatInstance` may not be wired up in the component tree yet.

### Files using runes must end in `.svelte`, `.svelte.ts`, or `.svelte.js`
Plain `.ts` files that use `$state`/`$derived`/`$effect` cause `rune_outside_svelte` SSR errors. Renamed `toast.store.ts` → `toast.store.svelte.ts` to fix this.

---

## Vercel AI SDK v6

### `sendMessage` expects `{ text: string }`, not a plain string
`chatInstance.sendMessage(draft)` crashes with "Cannot use 'in' operator to search for 'text'". The correct form is `chatInstance.sendMessage({ text: draft })` — same shape as `MessageComposer` uses internally.

---

## Playwright / E2E Testing

### `waitForResponse` with hardcoded `toHaveCount(2)` fails in multi-exchange tests
When a test performs two exchanges (4 bubbles total), `toHaveCount(2)` would sometimes "accidentally pass" before the second exchange appeared, then fail later. Fix: add an `expectedCount` parameter to `waitForResponse(timeout, expectedCount)` so each test can declare how many bubbles it expects.

### Persistence tests need `page.waitForResponse()` before reload
Model selector PATCH is async. If you `page.reload()` immediately after clicking the dropdown, the PATCH may not have completed yet and the test observes stale data. Fix: intercept the network response with `page.waitForResponse(/api\/chats/)` before reloading.

### Keep all inline Playwright timeouts ≤ 30 seconds
Longer timeouts (60s–120s) make the suite slow and mask real failures. 30s is the right ceiling for per-assertion timeouts in this project.

---

## TypeScript

### `Set.has()` vs. `Array.includes()` for readonly literal arrays
A `const MODELS = ['a', 'b'] as const` array produces a `readonly string[]`. TypeScript rejects `.includes(someString)` on it because the type checker wants a narrower guarantee. Using `new Set([...])` with `.has(someString)` sidesteps this without a type cast and compiles cleanly in dev/build.

---

## Auth.js v5 (`@auth/sveltekit`)

### Callback URL must be `/auth/callback/google`, not `/auth/google/callback`
The Google Cloud Console Authorized Redirect URI must be `http://localhost:5173/auth/callback/google`. The reversed form (`/auth/google/callback`) returns a 404 — Auth.js v5 uses the `/auth/callback/[provider]` convention.

### Always pass Google credentials explicitly via `$env/static/private`
Auth.js v5 auto-reads `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` from `process.env`, but SvelteKit's Vite build doesn't reliably expose arbitrary `.env` vars to `process.env`. Using `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (v4-style names) without explicit forwarding silently sends an empty `client_id`, producing Google's `Error 401: invalid_client` ("The OAuth client was not found"). Fix:
```ts
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
providers: [Google({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET })]
```
This also gives a build-time error if the vars are missing.

### `AUTH_SECRET` is required
Auth.js v5 needs `AUTH_SECRET` in `.env` for signing JWTs/sessions. Without it the handler throws at startup. Generate with `openssl rand -base64 32`.

### DrizzleAdapter requires four tables
The adapter needs `users`, `accounts`, `sessions`, and `verificationTokens`. The `users` table must be extended with `name`, `emailVerified`, and `image` columns beyond the app's own user columns.

### Session callback needed to expose `user.id`
By default `session.user` doesn't include `id`. Add a `session` callback that copies `user.id` from the database user:
```ts
callbacks: {
  session({ session, user }) {
    session.user.id = user.id;
    return session;
  }
}
```

---

## API Security

### Defense in depth: layout redirect + API auth guards + userId scoping
Three independent layers:
1. **Layout redirect** — stops unauthenticated browsers at the SvelteKit level.
2. **`requireUserId(event)`** — every API route throws 401 if session is missing (protects direct HTTP access).
3. **WHERE `userId = ?`** — resource-level queries scope to the authenticated user, preventing IDOR attacks where user A reads/modifies user B's data by guessing an ID.

### `requireUserId` pattern
```ts
export async function requireUserId(event: RequestEvent): Promise<string> {
  const session = await event.locals.auth();
  if (!session?.user?.id) throw error(401, 'Unauthorized');
  return session.user.id;
}
```
Called at the top of every route handler; combine the returned `userId` with `and(eq(table.id, params.id), eq(table.userId, userId))` in WHERE clauses.

---

## Marked / Syntax Highlighting

### `markedHighlight` plugin double-processes code tokens
The plugin pre-modifies token text before the custom renderer runs, so `hljs` sees already-escaped HTML spans and renders them as literal text. Fix: remove `markedHighlight` and handle all syntax highlighting directly in the custom `renderer.code` override.

---

## Database / Drizzle

### `--force` on `drizzle-kit push` does not suppress column-rename prompts
For clean DB resets, drop tables via Neon MCP first, then run `pnpm db:push`. The `--force` flag only skips data-loss warnings, not interactive rename disambiguation.

### `pgvector` extension must exist before `db:push`
Run `CREATE EXTENSION IF NOT EXISTS vector;` on the Neon DB before pushing a schema that includes `vector` columns.

---

## Destructive Regeneration (Edit → Re-stream) Pattern

The winning implementation for "edit a user message and re-stream from that point":

1. Call `DELETE /api/chats/[id]/messages/after` with `inclusive: true` to remove pivot message and everything after it from the DB.
2. Directly reassign `$state` variables: `chatInstance = new Chat({ messages: kept })` and reset `dbMessageMap`.
3. `await tick()` to flush Svelte effects.
4. `await chatInstance.sendMessage({ text: draft })` to start the new stream.

This bypasses the SvelteKit data pipeline entirely — no `invalidate()`, no `goto()`, no `$effect` chaining needed.
