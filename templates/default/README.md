# Agent Template

Production-oriented starter for building AI agent systems with:

- Next.js App Router
- OpenAI Agents JS SDK
- Tool-first design with schema validation
- Runtime execution layer separated from HTTP/UI
- Optional streaming responses via SSE

## Project Structure

- `agents/main.agent.ts`: main agent definition and stable instructions
- `tools/`: deterministic, validated tools
- `runtime/agentRunner.ts`: SDK execution wrapper
- `app/api/agent/route.ts`: HTTP API with validation and streaming support

## Environment

Create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
# Optional
# OPENAI_MODEL=gpt-5-mini
# AGENTS_TRACING_DISABLED=true
# AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false
# AGENT_LOCAL_SESSION_TTL_MS=1800000
# AGENT_MAX_LOCAL_SESSIONS=200
```

## Run

```bash
npm run dev
```

## API

### Standard run

`POST /api/agent`

```json
{
  "message": "What is 42 multiplied by 13?",
  "conversationId": "thread-1",
  "maxTurns": 8
}
```

`conversationId` behavior:

- If it matches `conv_[A-Za-z0-9_-]+` (for example `conv_abc123`), it is forwarded to OpenAI as a native conversation ID.
- Otherwise (for example `thread-1`), it is used as a local in-memory thread key via SDK session memory.

Example:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "content-type: application/json" \
  -d '{"message":"What is 42 multiplied by 13?"}'
```

### Streaming run (SSE)

`POST /api/agent?stream=true`

```bash
curl -N -X POST 'http://localhost:3000/api/agent?stream=true' \
  -H 'content-type: application/json' \
  -d '{"message":"Explain binary search in 5 lines"}'
```

SSE events:

| Event | Payload | Description |
|---|---|---|
| `ready` | `{ ok: true }` | Stream initialized |
| `text_delta` | `{ delta: string }` | Incremental text chunk |
| `tool_call` | `{ callId, name, arguments }` | Tool invocation started |
| `tool_output` | `{ callId, output }` | Tool returned a result |
| `done` | `{ output, responseId }` | Run completed |
| `error` | `{ message }` | Error occurred |

## Going to Production

See [PRODUCTION_GUIDE.md](./PRODUCTION_GUIDE.md) for auth, persistent sessions, rate limiting, and error monitoring.

## Best-Practice Notes

- Inputs are validated with Zod at API/runtime boundaries.
- Tools are deterministic and fail loudly for invalid operations.
- Agent instructions are concise and tool-oriented.
- Runtime logic is isolated from route handlers for extensibility.
