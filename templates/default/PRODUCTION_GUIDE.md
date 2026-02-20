# Going to Production

This guide covers what to add on top of the template before deploying to real users. The template is intentionally unopinionated about these choices — pick what fits your stack.

---

## Authentication

The API route (`/api/agent`) ships wide open. You need to gate it.

### Recommended Pattern: Auth Hook

Create a single function that every route calls first:

```ts
// runtime/auth.ts
export type AuthResult = { userId: string; [key: string]: unknown };

export async function authenticateRequest(
  req: Request,
): Promise<AuthResult | null> {
  // Return null to reject, return { userId } to allow
  return null;
}
```

Wire it into the route handler:

```ts
// app/api/agent/route.ts — add at the top of POST()
const auth = await authenticateRequest(request);
if (!auth) {
  return createErrorResponse(401, "unauthorized", "Authentication required.");
}
```

This keeps auth decoupled from agent logic. Swap the implementation without touching routes.

### Implementation Examples

#### API Key (server-to-server)

Simplest option. Store keys in your database or as environment variables.

```ts
export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
  const key = req.headers.get("x-api-key");
  if (!key) return null;

  const user = await lookupApiKey(key); // your DB lookup
  return user ? { userId: user.id } : null;
}
```

#### Bearer Token / JWT

Standard for SPAs and mobile apps.

```ts
import { jwtVerify } from "jose"; // npm install jose

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function authenticateRequest(req: Request): Promise<AuthResult | null> {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const { payload } = await jwtVerify(header.slice(7), secret);
    return { userId: payload.sub as string };
  } catch {
    return null;
  }
}
```

#### NextAuth.js

If your app already has NextAuth sessions:

```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function authenticateRequest(): Promise<AuthResult | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ? { userId: session.user.id } : null;
}
```

#### Clerk / Supabase Auth

Both provide Next.js middleware and `auth()` helpers for route handlers. Follow their docs — they drop in cleanly since the hook pattern is the same shape.

---

## Rate Limiting

Once you have a `userId` from auth, limit requests per user.

### Upstash (serverless-friendly)

```bash
npm install @upstash/ratelimit @upstash/redis
```

```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, "1 m"),
});

// In POST(), after auth:
const { success } = await ratelimit.limit(auth.userId);
if (!success) {
  return createErrorResponse(429, "rate_limited", "Too many requests. Try again shortly.");
}
```

### Other options

- **In-memory Map** — fine for single-instance deployments, resets on restart
- **API gateway** — Cloudflare, Vercel, and AWS all have built-in rate limiting at the edge

---

## Persistent Sessions

The template uses in-memory sessions (`MemorySession` wrapped by `FilteredMemorySession`). These reset on every server restart. For production, implement the `Session` interface with a real store.

### The Interface

Your implementation needs these five methods:

```ts
interface Session {
  getSessionId(): Promise<string>;
  getItems(limit?: number): Promise<AgentInputItem[]>;
  addItems(items: AgentInputItem[]): Promise<void>;
  popItem(): Promise<AgentInputItem | undefined>;
  clearSession(): Promise<void>;
}
```

### Where to Swap

In `runtime/agentRunner.ts`, replace `FilteredMemorySession` in `getOrCreateLocalSession()` with your persistent implementation.

### SQLite (zero-infra option)

No external services needed. File-based. Good for single-server deployments.

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

Schema:

```sql
CREATE TABLE IF NOT EXISTS session_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL,
  item        JSON NOT NULL,
  created_at  INTEGER DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_session_id ON session_items(session_id);
```

Implementation sketch:

- `getItems()` → `SELECT item FROM session_items WHERE session_id = ? ORDER BY id ASC`
- `addItems()` → batch `INSERT` in a transaction
- `popItem()` → `DELETE ... WHERE id = (SELECT MAX(id) ...) RETURNING item`
- `clearSession()` → `DELETE FROM session_items WHERE session_id = ?`

### Redis

Good for multi-instance deployments and serverless. Use a Redis list per session:

- `addItems()` → `RPUSH session:{id} ...items`
- `getItems()` → `LRANGE session:{id} 0 -1` (or `-limit -1` for last N)
- `popItem()` → `RPOP session:{id}`
- `clearSession()` → `DEL session:{id}`

Set TTL with `EXPIRE` to auto-clean stale sessions.

### PostgreSQL / MySQL

Same table design as SQLite. Use JSONB for the `item` column in Postgres. Works with Prisma, Drizzle, or raw queries.

### Important: Filter Reasoning Items

**Regardless of storage backend**, filter out items where `type === "reasoning"` in your `getItems()` implementation. Models like `gpt-5-mini` produce reasoning items that the OpenAI API rejects when sent back without their required following item. See `FilteredMemorySession` in the template for the pattern.

---

## Error Monitoring

### Structured Logging

Replace raw `console.error` with JSON-structured logs for easier parsing in log aggregators:

```ts
// runtime/logger.ts
export function logError(error: unknown, context: Record<string, unknown> = {}) {
  console.error(JSON.stringify({
    level: "error",
    timestamp: new Date().toISOString(),
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
  }));
}

export function logInfo(event: string, context: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    level: "info",
    timestamp: new Date().toISOString(),
    event,
    ...context,
  }));
}
```

Usage in the route handler:

```ts
logInfo("agent_run_start", { userId: auth.userId, conversationId });
// ... run agent ...
logInfo("agent_run_complete", { userId: auth.userId, durationMs: Date.now() - start });
```

### Error Tracking Services

Add a reporting hook in `handleRouteError()`:

```ts
// Sentry
import * as Sentry from "@sentry/nextjs";
Sentry.captureException(error, { extra: { conversationId, userId } });

// Datadog
import { datadogLogs } from "@datadog/browser-logs";
datadogLogs.logger.error("Agent run failed", { error, conversationId });
```

### OpenAI SDK Tracing

Already supported via environment variables:

```bash
AGENTS_TRACING_DISABLED=false
AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=true  # dev only — never in production
```

Traces appear in the OpenAI dashboard under the workflow name `agent-template-main`.

### Health Check

Add a health endpoint for load balancers and uptime monitors:

```ts
// app/api/health/route.ts
export function GET() {
  return Response.json({ status: "ok", timestamp: Date.now() });
}
```

---

## Deployment Checklist

- [ ] Auth middleware wired into `/api/agent` route
- [ ] Rate limiting enabled per user
- [ ] Sessions backed by persistent storage
- [ ] `OPENAI_API_KEY` set in production environment (not `.env.local`)
- [ ] `AGENTS_TRACE_INCLUDE_SENSITIVE_DATA` is `false` in production
- [ ] Error tracking service connected
- [ ] Health check endpoint responding
- [ ] CORS configured if frontend is on a different origin
- [ ] `reasoning` items filtered from session history
