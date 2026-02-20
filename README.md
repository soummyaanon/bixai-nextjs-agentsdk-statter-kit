# @bixai/create-agent-sdk-starter

CLI to scaffold a production-ready Next.js + OpenAI Agents SDK starter app.

## Why this package

This starter is designed for building real agent applications with a clean structure:

- Next.js App Router baseline
- OpenAI Agents SDK integration
- Tool-first architecture with typed boundaries
- API route that supports standard JSON and SSE streaming
- Runtime layer separated from HTTP route handlers

## Requirements

- Node.js 20.9 or newer
- npm

Why `20.9+`:

- The generated starter uses Next.js `16.x`, which requires Node.js `20.9+`.

## Quick start

Run without installing:

```bash
npx @bixai/create-agent-sdk-starter my-agent-app
cd my-agent-app
npm install
npm run dev
```

Or install globally:

```bash
npm install -g @bixai/create-agent-sdk-starter
create-agent-sdk-starter my-agent-app
```

## Install command on npm

On npm, you will see:

```bash
npm i @bixai/create-agent-sdk-starter
```

This is npm's default install snippet for this package. It is normal.

## CLI reference

Command:

```bash
create-agent-sdk-starter <project-name>
```

Arguments:

- `project-name`: directory name for your new app

Behavior:

- Copies template files into `<project-name>`
- Renames `gitignore` to `.gitignore`
- Fails if target directory already exists

## What gets generated

Important generated files and folders:

```text
my-agent-app/
  app/
    api/agent/route.ts
    _components/
  agents/main.agent.ts
  runtime/agentRunner.ts
  tools/
  PRODUCTION_GUIDE.md
  package.json
```

## Configure the generated app

In the generated project, create `.env.local`:

```bash
OPENAI_API_KEY=your_key_here
# Optional
# OPENAI_MODEL=gpt-5-mini
# AGENTS_TRACING_DISABLED=true
# AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false
# AGENT_LOCAL_SESSION_TTL_MS=1800000
# AGENT_MAX_LOCAL_SESSIONS=200
```

Start the generated app:

```bash
npm run dev
```

## API quick test (generated app)

Standard request:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "content-type: application/json" \
  -d '{"message":"What is 42 multiplied by 13?"}'
```

Streaming request:

```bash
curl -N -X POST "http://localhost:3000/api/agent?stream=true" \
  -H "content-type: application/json" \
  -d '{"message":"Explain binary search in 5 lines"}'
```

See `PRODUCTION_GUIDE.md` in the generated project for auth, rate limiting, persistent sessions, and monitoring.

## Troubleshooting

`npx @bixai/create-agent-sdk-starter` fails on older Node:

- Upgrade Node.js to `20.9+` and retry.

npm page README is stale:

- npm renders the README bundled in the published tarball.
- Any README change needs a new published package version.

macOS cache permission error (`EPERM` under `~/.npm`):

- Fix permissions:

```bash
sudo chown -R "$(id -u)":"$(id -g)" ~/.npm
```

## License

ISC
