# Contributing Guide

Thank you for wanting to improve the **Personal Intelligence Node**. This project is entirely static and built with [Astro](https://astro.build/). Before you begin, read [PLAN.md](PLAN.md) for the architecture overview and [AGENTS.md](AGENTS.md) for repository conventions.

## Project Setup

1. Install **Node.js 20**.
2. Clone the repository and install dependencies:

   ```bash
   npm ci
   npm run dev
   ```
3. Husky manages Git hooks. `npm ci` installs them automatically, but you can run `npm run prepare` if they are missing.
4. Copy any required secrets to your GitHub repository settings. Never commit API keys or tokens.

## Development Workflow

- Run the tests with:

  ```bash
  npm test
  ```

- Lint and format before committing:

  ```bash
  npm run lint
  npm run format
  ```

- Follow the existing ESLint and Prettier configuration. All scripts use modern ESM syntax (`*.mjs`).
- Commit messages must use the [Conventional Commits](https://www.conventionalcommits.org/) format.

## Pull Request Process

1. Create feature branches from `main`.
2. Ensure `npm test` passes and code is linted.
3. Update `PLAN.md` and `tasks.yml` if your work changes scope or completes a task.
4. Open a PR targeting `main` and summarise your changes, referencing relevant PLAN.md sections.

For more details about the automation scripts, see the documentation in `docs/`.

## Security Vulnerabilities

Please do **not** create public issues for security problems. Instead, report
them privately by emailing [security@adrianwedd.com](mailto:security@adrianwedd.com)
or by opening a pull request from a temporary **private** fork. This allows us
to fix the issue before full disclosure. See [SECURITY.md](SECURITY.md) for the
full reporting policy.
