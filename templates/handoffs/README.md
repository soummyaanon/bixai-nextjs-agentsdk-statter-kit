# Agent SDK Starter — Handoffs Template

Production-ready Next.js + OpenAI Agents SDK app demonstrating **multi-agent handoffs** — scaffolded by [`@bixai/create-agent-sdk-starter`](https://www.npmjs.com/package/@bixai/create-agent-sdk-starter).

A `triage` orchestrator reads each user message and hands off to a specialist agent — `math-specialist` for arithmetic, `weather-specialist` for weather. The runner follows handoffs automatically; specialists own their own tools.

---

## Features

- **Next.js 16 App Router** with React 19
- **OpenAI Agents SDK handoffs** — triage agent routes to specialist sub-agents
- **Tool-scoped agents** — each specialist owns its own Zod-validated tools
- **SSE streaming** — real-time token and tool-call events
- **Runtime isolation** — agent execution decoupled from HTTP routing
- **Local session memory** — in-memory conversation threading with TTL eviction

---

## Project structure

```
agents/triage.agent.ts    — Orchestrator with handoffs: [mathAgent, weatherAgent]
agents/math.agent.ts      — Math specialist (owns calculatorTool)
agents/weather.agent.ts   — Weather specialist (owns weatherTool)
agents/main.agent.ts      — Re-exports triageAgent as mainAgent (runtime entry)
tools/                    — Individual tool implementations (Zod-validated)
runtime/agentRunner.ts    — SDK execution wrapper (run + stream)
app/api/agent/route.ts    — HTTP API with error handling and SSE support
app/_components/          — Chat UI (Sidebar, MessageBubble, ToolCallBlock)
lib/                      — Shared types, storage helpers, UI primitives
```

---

## How handoffs work

The triage agent has no tools of its own. It uses each specialist's `handoffDescription` to pick the right route. Once handed off, the specialist runs to completion using its scoped tools. Add a new specialist in three steps:

1. Create `agents/<name>.agent.ts` with a `handoffDescription` and its tools.
2. Import it in `agents/triage.agent.ts` and add to the `handoffs` array.
3. Update the triage instructions so the orchestrator knows when to route to it.

Inspect handoff routing in the [OpenAI Traces dashboard](https://platform.openai.com/traces) — workflow name is `agent-template-handoffs`.

---

## Setup

1. Copy the example env file and add your key:

```bash
cp .env.local.example .env.local
```

```bash
# .env.local
OPENAI_API_KEY=sk-...

# Optional overrides
# OPENAI_MODEL=gpt-4o-mini
# AGENTS_TRACING_DISABLED=true
# AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false
# AGENT_LOCAL_SESSION_TTL_MS=1800000   # session TTL in ms (default: 30 min)
# AGENT_MAX_LOCAL_SESSIONS=200         # max concurrent sessions (default: 200)
```

2. Install dependencies and start:

```bash
npm install && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API

### Standard (JSON) — `POST /api/agent`

```json
{
  "message": "What is 42 multiplied by 13?",
  "conversationId": "thread-1",
  "maxTurns": 8
}
```

**`conversationId` routing:**

| Value | Behavior |
|---|---|
| `conv_[A-Za-z0-9_-]+` (e.g. `conv_abc123`) | Forwarded to OpenAI as a native conversation ID |
| Any other string (e.g. `thread-1`) | Used as a local in-memory session key |
| Omitted | Stateless — no conversation history |

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "content-type: application/json" \
  -d '{"message":"What is 42 multiplied by 13?"}'
```

### Streaming (SSE) — `POST /api/agent?stream=true`

```bash
curl -N -X POST 'http://localhost:3000/api/agent?stream=true' \
  -H 'content-type: application/json' \
  -d '{"message":"Explain binary search in 5 lines"}'
```

**SSE event reference:**

| Event | Payload | Description |
|---|---|---|
| `ready` | `{ ok: true }` | Stream initialized |
| `text_delta` | `{ delta: string }` | Incremental text chunk |
| `tool_call` | `{ callId, name, arguments }` | Tool invocation started |
| `tool_output` | `{ callId, output }` | Tool result returned |
| `done` | `{ output, responseId }` | Run completed |
| `error` | `{ message }` | Error during execution |

---

## Adding a tool

1. Create `tools/my-tool.tool.ts` following the pattern in `tools/calculator.tool.ts`.
2. Export it from `tools/index.ts`.
3. The agent picks it up automatically — no other changes needed.

---

## Going to production

See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for:

- Authentication (API key, JWT, NextAuth, Clerk)
- Rate limiting
- Persistent session storage
- Error monitoring

---

## Design principles

- All inputs validated with Zod at API and runtime boundaries
- Tools are deterministic and throw on invalid operations — no silent failures
- Agent instructions are concise and tool-oriented
- Runtime logic is isolated from route handlers for easy testing and extension
