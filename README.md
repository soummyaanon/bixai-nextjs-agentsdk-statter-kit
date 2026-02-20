# @bixai/create-agent-sdk-starter

[![GitHub Repo](https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github)](https://github.com/soummyaanon/bixai-nextjs-agentsdk-statter-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Star on GitHub](https://img.shields.io/github/stars/soummyaanon/bixai-nextjs-agentsdk-statter-kit?style=flat-square&logo=github)](https://github.com/soummyaanon/bixai-nextjs-agentsdk-statter-kit)

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
npx @bixai/create-agent-sdk-starter my-agent-app
cd my-agent-app
npm install
cp .env.local.example .env.local   # then add your OPENAI_API_KEY
npm run dev
```

Or install globally:

```bash
npm install -g @bixai/create-agent-sdk-starter
create-agent-sdk-starter my-agent-app
```

---

## CLI reference

```bash
create-agent-sdk-starter <project-name>
```

- `project-name` — target directory for the new app
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

Create `.env.local` in the generated project:

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

**`npx` fails on older Node** — Upgrade to Node.js `20.9+` and retry.

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
