# Contributing Guide

Thank you for your interest in improving the **Personal Intelligence Node**. This repository is designed for a fully static deployment on GitHub Pages. Before contributing, please review [PLAN.md](PLAN.md) for the overall architecture and [AGENTS.md](AGENTS.md) for project-wide conventions.

## Project Setup

1. Install Node.js 20 and clone the repository.
2. Install dependencies and start the dev server:

```bash
npm ci
npm run dev
```

3. Run the automated tests:

```bash
npm test
```

The repository uses [Husky](https://typicode.github.io/husky) to manage Git hooks. Running `npm ci` or `npm install` will trigger the `prepare` script and install the hooks locally. If they are missing, run:

```bash
npm run prepare
```

4. Lint and format all files:

```bash
npm run lint
npm run format
```

Secrets like `GH_TOKEN` or `OPENAI_API_KEY` must be stored as repository secrets. Never commit API keys or other credentials.

## Coding Standards

- Use modern ESM syntax (`import`/`export`) for all Node scripts (`*.mjs`).
- Follow the existing ESLint and Prettier configuration.
- Place unit tests in the `test/` directory and run them with [Vitest](https://vitest.dev/).
- Ensure scripts run under Node 20 with `node --experimental-specifier-resolution=node` if needed.
- Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format. A `commit-msg` hook will reject non‑conforming messages.

## Pull Requests

- Keep the site fully static—no server‑side code.
- Update `PLAN.md` and `tasks.yml` when your changes alter project scope or complete a listed task.
- Run `npm test` and ensure all Vitest suites pass before opening a PR.
- Summarise major changes in the PR description and reference relevant PLAN.md sections.

For more information about automation scripts and troubleshooting, see the documentation under `docs/`.
