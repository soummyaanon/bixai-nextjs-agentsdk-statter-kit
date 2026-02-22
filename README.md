# @bixai/create-agent-sdk-starter

CLI to scaffold a production-ready Next.js + OpenAI Agents SDK starter app.

**Open source** — If this helps you build agent apps, consider giving it a ⭐ [star on GitHub](https://github.com/soummyaanon/bixai-nextjs-agentsdk-statter-kit)!

---

## Why this package

Built for real agent applications with a clean structure:

- Next.js App Router baseline
- OpenAI Agents SDK integration
- Tool-first architecture with typed boundaries
- API route with standard JSON and SSE streaming
- Runtime layer separated from HTTP route handlers

---

## Requirements

- Node.js `20.9+` — required by Next.js 16.x
- npm

---

## Quick start

```bash
npx @bixai/create-agent-sdk-starter
# prompts:
# - project name (example: my-agent-app)
# - package manager (npm/pnpm/yarn/bun)
# - install dependencies now (Y/n)
cd my-agent-app
cp .env.local.example .env.local   # then add your OPENAI_API_KEY
# then run dev using your selected package manager
```

## Create a new app

Using npm:

```bash
npx @bixai/create-agent-sdk-starter
```

Using pnpm:

```bash
pnpm dlx @bixai/create-agent-sdk-starter
```

Using yarn:

```bash
yarn dlx @bixai/create-agent-sdk-starter
```

Using bun:

```bash
bunx @bixai/create-agent-sdk-starter
```

Or install globally:

```bash
npm install -g @bixai/create-agent-sdk-starter
create-agent-sdk-starter
```

You can still skip the prompt by passing a name directly:

```bash
npx @bixai/create-agent-sdk-starter my-app
```

---

## CLI reference

```bash
create-agent-sdk-starter [project-name]
```

- `project-name` — optional target directory name
- If omitted, the CLI prompts for project name interactively
- Interactive mode also prompts for package manager and optional dependency install
- Fails if the directory already exists
- Automatically renames `gitignore` → `.gitignore`

---

## Generated structure

```
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

---

## Configure

Create `.env.local` in the generated project :

```bash
OPENAI_API_KEY=your_key_here

# Optional
# OPENAI_MODEL=gpt-5-mini
# AGENTS_TRACING_DISABLED=true
# AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false
# AGENT_LOCAL_SESSION_TTL_MS=1800000
# AGENT_MAX_LOCAL_SESSIONS=200
```

Then start the dev server:

```bash
npm run dev
```

---

## Test the API

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

---

## Troubleshooting

`**npx` fails on older Node** — Upgrade to Node.js `20.9+` and retry.

**npm page README is stale** — npm renders the README bundled at publish time. Any update requires a new package version.

**macOS `EPERM` under `~/.npm`** — Fix permissions:

```bash
sudo chown -R "$(id -u)":"$(id -g)" ~/.npm
```

---

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.

---

## Author

**[Soumyaranjan Panda](https://github.com/soummyaanon)** — [@soummyaanon](https://github.com/soummyaanon)
