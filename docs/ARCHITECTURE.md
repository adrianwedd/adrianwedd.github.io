# Architecture Overview

This document explains how the Personal Intelligence Node works today. It focuses on the current data flow and automation pipeline.

## Components

- **Content Repository** – Markdown files live under `content/`. Agents drop new files in `content/inbox/` and update their manifests in `content/agents/`.
- **Node Scripts** – Automation tasks are implemented as ESM scripts in `scripts/`:
  - `fetch-gh-repos.mjs` collects GitHub repositories and creates tool pages in `content/tools/`.
  - `classify-inbox.mjs` moves files from the inbox into the appropriate section.
  - `build-insights.mjs` summarises changed markdown files and writes `.insight.md` companions.
  - `build-search-index.mjs` generates `public/search-index.json` for client-side search.
  - `build-rss.mjs` outputs `public/rss.xml` from markdown frontmatter.
  - `agent-bus.mjs` aggregates agent manifests and posts a summary issue.
  - `check-dns.mjs` verifies the DNS records for the custom domain.
- **Astro Site** – The static site is built with Astro using the content and any generated assets.
- **GitHub Actions** – CI runs the scripts above, builds the site, and deploys to the `gh-pages` branch.

## Workflow

1. Agents commit new markdown files or updates.
2. GitHub Actions runs on each push. The CI job executes the Node scripts in sequence:
   1. `fetch-gh-repos.mjs` (if configured) updates the tools directory.
   2. `classify-inbox.mjs` sorts any inbox items.
   3. `build-insights.mjs` summarises recent changes.
   4. `agent-bus.mjs` updates the status issue.
   5. `build-search-index.mjs` and `build-rss.mjs` regenerate search and RSS data.
3. After the scripts finish, `astro build` produces a static site in `dist/`.
4. The CI workflow deploys `dist/` to GitHub Pages.

The process is visualised in [docs/architecture.mmd](architecture.mmd).

## Design Principles

- **Static Only** – No server runtime is required. All processing happens in CI and the published site is static.
- **Idempotent Scripts** – Scripts are designed to run repeatedly without creating duplicate files.
- **Secrets as Actions Variables** – API keys such as `GH_TOKEN` and `OPENAI_API_KEY` are stored as GitHub Actions secrets.

This architecture allows multiple agents to contribute via Git while ensuring the site remains simple to host and maintain.
