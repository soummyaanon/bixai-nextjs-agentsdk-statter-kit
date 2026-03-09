# @bixai/Agent SDK Statter Kit

[![npm](https://img.shields.io/npm/v/@bixai/create-agent-sdk-starter)](https://www.npmjs.com/package/@bixai/create-agent-sdk-starter)
[![license](https://img.shields.io/npm/l/@bixai/create-agent-sdk-starter)](LICENSE)
[![node](https://img.shields.io/node/v/@bixai/create-agent-sdk-starter)](https://nodejs.org)
[![AweOSS Score](https://api.aweoss.dev/badge/soummyaanon/bixai-nextjs-agentsdk-statter-kit.svg?style=plastic&type=score)](https://aweoss.dev/projects/soummyaanon-bixai-nextjs-agentsdk-statter-kit)

CLI to scaffold a production-ready **Next.js + OpenAI Agents SDK** starter app in seconds.

If this helps you ship agent apps faster, consider giving it a ⭐ [star on GitHub](https://github.com/soummyaanon/bixai-nextjs-agentsdk-statter-kit)!

---

## What you get

- **Next.js 16 App Router** — baseline project, no cruft
- **OpenAI Agents SDK** — integrated and configured out of the box
- **Tool-first architecture** — typed tool boundaries with Zod validation
- **Dual transport** — standard JSON responses and SSE streaming on the same route
- **Runtime isolation** — agent execution layer is separate from route handlers
- **Production guide** — auth, rate limiting, persistent sessions, and monitoring patterns included

---

## Requirements

- **Node.js `20.9+`** — required by Next.js 16.x
- Any of: `npm`, `pnpm`, `yarn`, or `bun`

---

## Quick start

```bash
npx @bixai/create-agent-sdk-starter
# Prompts for:
#   - project name  (e.g. my-agent-app)
#   - package manager  (npm / pnpm / yarn / bun)
#   - install dependencies now  (Y/n)
cd my-agent-app
cp .env.local.example .env.local   # add your OPENAI_API_KEY
npm run dev
```

## Create a new app

```bash
# npm
npx @bixai/create-agent-sdk-starter

# pnpm
pnpm dlx @bixai/create-agent-sdk-starter

# yarn
yarn dlx @bixai/create-agent-sdk-starter

# bun
bunx @bixai/create-agent-sdk-starter
```

**Skip the prompt** by passing the project name directly:

```bash
npx @bixai/create-agent-sdk-starter my-app
```

**Install globally** and reuse:

```bash
npm install -g @bixai/create-agent-sdk-starter
create-agent-sdk-starter
```

---

## CLI reference

```
create-agent-sdk-starter [project-name]
```

| Option | Description |
|---|---|
| `project-name` | Target directory name. Prompts interactively if omitted. |

- Fails early if the target directory already exists
- Interactive mode selects package manager and optionally installs dependencies
- Automatically renames `gitignore` → `.gitignore` post-copy

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

Copy `.env.local.example` to `.env.local` and add your key:

```bash
OPENAI_API_KEY=sk-...

# Optional overrides
# OPENAI_MODEL=gpt-4o-mini
# AGENTS_TRACING_DISABLED=true
# AGENTS_TRACE_INCLUDE_SENSITIVE_DATA=false
# AGENT_LOCAL_SESSION_TTL_MS=1800000
# AGENT_MAX_LOCAL_SESSIONS=200
```

Then start the dev server:

```bash
npm run dev        # npm
pnpm dev           # pnpm
yarn dev           # yarn
bun run dev        # bun
```

---

## Test the API

**Standard (JSON) request:**

```bash
curl -X POST http://localhost:3000/api/agent \
  -H "content-type: application/json" \
  -d '{"message":"What is 42 multiplied by 13?"}'
```

**Streaming (SSE) request:**

```bash
curl -N -X POST "http://localhost:3000/api/agent?stream=true" \
  -H "content-type: application/json" \
  -d '{"message":"Explain binary search in 5 lines"}'
```

See `PRODUCTION_GUIDE.md` in the generated project for auth, rate limiting, persistent sessions, and monitoring.

---

## Troubleshooting

**`npx` fails on older Node** — Upgrade to Node.js `20.9+` and retry.

**npm README is stale** — npm renders the README bundled at publish time. Updates require a new package version.

**macOS `EPERM` under `~/.npm`** — Fix permissions:

```bash
sudo chown -R "$(id -u)":"$(id -g)" ~/.npm
```

---

## License

[MIT](LICENSE)

---

## Author

**[Soumyaranjan Panda](https://github.com/soummyaanon)** — [@soummyaanon](https://github.com/soummyaanon)
