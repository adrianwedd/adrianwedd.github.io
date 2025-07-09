# Agent Guidelines

This repository houses the **Personal Intelligence Node** project. Agents working here should observe the following principles:

1. **Documentation First** – keep `PLAN.md` and `tasks.yml` up to date when scopes change.
2. **No Secrets in Code** – API keys and tokens must be added as repository secrets for GitHub Actions.
3. **Static Only** – the deployed site must remain a fully static GitHub Pages build (currently using Astro as described in `PLAN.md`).
4. **Script Style** – Node scripts are written in ESM syntax (`.mjs`) and should pass `node --experimental-specifier-resolution=node` if needed. Use modern JavaScript and avoid deprecated APIs.
5. **Testing** – Vitest tests live in the `test/` directory and must be run before committing.
6. **Pull Requests** – when opening a PR, summarise major changes and reference relevant sections of `PLAN.md`.

These guidelines apply to the entire repository.
