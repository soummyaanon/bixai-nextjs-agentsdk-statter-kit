# Contributing to @bixai/create-agent-sdk-starter

Thank you for your interest in contributing! This document outlines the process for reporting issues, suggesting improvements, and submitting pull requests.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Reporting Issues](#reporting-issues)
- [Suggesting Features](#suggesting-features)
- [Development Workflow](#development-workflow)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Code Style](#code-style)
- [Commit Messages](#commit-messages)

---

## Getting Started

1. Fork the repository on GitHub.
2. Clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/bixai-nextjs-agentsdk-statter-kit.git
   cd bixai-nextjs-agentsdk-statter-kit
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Build the project:

   ```bash
   npm run build
   ```

5. Test the CLI locally:

   ```bash
   node dist/index.js
   ```

---

## Reporting Issues

Before opening an issue, please search existing issues to avoid duplicates.

When filing a bug report, include:

- A clear, descriptive title
- Steps to reproduce the problem
- Expected vs. actual behavior
- Node.js version (`node -v`) and OS
- Any relevant error messages or stack traces

---

## Suggesting Features

Open a GitHub Discussion or issue with:

- A description of the problem you are trying to solve
- Your proposed solution or idea
- Any alternatives you have considered

---

## Development Workflow

The source lives in `src/` and project templates live in `templates/`.

| Path | Purpose |
|------|---------|
| `src/index.ts` | CLI entry point |
| `templates/default/` | Scaffolded project template |
| `templates/default/agents/` | Agent definitions |
| `templates/default/tools/` | Tool definitions |
| `templates/default/runtime/` | Agent runner |

After making changes, rebuild before testing:

```bash
npm run build
```

---

## Pull Request Guidelines

1. **Branch** — create a feature branch from `main`:

   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Scope** — keep PRs focused. One feature or fix per PR.
3. **Tests** — add or update tests if applicable.
4. **Documentation** — update `README.md` or relevant docs if your change affects public behavior.
5. **Build** — ensure `npm run build` succeeds before opening a PR.
6. **Description** — fill in the PR template with a clear summary of what changed and why.

---

## Code Style

- TypeScript throughout — avoid `any` where possible.
- Follow the existing ESLint configuration in `eslint.config.mjs`.
- Run the linter before committing:

  ```bash
  npm run lint
  ```

---

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for bun package manager
fix: resolve path issue on Windows
docs: update quick start instructions
chore: bump dependencies
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`.

---

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
