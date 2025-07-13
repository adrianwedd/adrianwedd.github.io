# Agent Guidelines

This repository houses the **Personal Intelligence Node** project. Agents working here should observe the following principles:

1. **Documentation First** – keep `PLAN.md` and `tasks.yml` up to date when scopes change.
2. **No Secrets in Code** – API keys and tokens must be added as repository secrets for GitHub Actions.
3. **Static Only** – the deployed site must remain a fully static GitHub Pages build (currently using Astro as described in `PLAN.md`).
4. **Script Style** – Node scripts are written in ESM syntax (`.mjs`) and should pass `node --experimental-specifier-resolution=node` if needed. Use modern JavaScript and avoid deprecated APIs.
5. **Testing** – Vitest tests live in the `test/` directory and must be run before committing.
6. **Pull Requests** – when opening a PR, summarise major changes and reference relevant sections of `PLAN.md`.
7. **Task Tracking** – update `tasks.yml` to reflect task status whenever work is performed or analysed, ensuring commits always capture the latest state.

These guidelines apply to the entire repository.

## Contributing New Content

Agents add knowledge by committing files under `content/`. Use the `content/inbox/` folder for unclassified drops. The CI workflow runs classification and insight scripts, moving files into the correct section automatically.

1. Create your markdown or asset file and place it in `content/inbox/`.
2. Commit the file with a clear Conventional Commit message.
3. Open a pull request targeting `main`.
4. CI will classify and relocate files during the build.

### Required Frontmatter

Every markdown file must begin with YAML frontmatter providing at least:

```yaml
title: My Post Title
date: 2024-01-01T12:00:00Z
tags: [tag1, tag2]
description: Short summary of the content
status: draft # draft | published | archived
```

The `status` field allows scripts to exclude drafts from the site until they are ready.

### File Naming Conventions

- Use lowercase kebab-case for filenames.
- Prefix notes with the date in `YYYY-MM-DD` format when applicable (e.g. `2024-05-01-my-note.md`).
- Insight files created by automation use the `.insight.md` suffix and live next to their source file.

## Agent Interaction Protocol

Agents collaborate through pull requests and must maintain a manifest in
`content/agents/` that conforms to
[`docs/agent-manifest-schema.json`](docs/agent-manifest-schema.json). This
metadata keeps the Agent Bus issue up to date.

### Status Reporting

Every agent must also record its latest activity in a shared `status.json` file
at the repository root. Each agent updates only its own entry to avoid merge
conflicts. A minimal example:

```json
{
  "codex-agent": {
    "status": "running",
    "updated": "2024-05-01T12:00:00Z",
    "message": "processing inbox"
  }
}
```

### Idempotent Scripts

Automation scripts should be **idempotent** so they can run repeatedly without
producing duplicates or inconsistent state. Examples include:

- `classify-inbox.mjs` skipping files that were already moved
- `build-insights.mjs` overwriting existing insight files
- `agent-bus.mjs` updating the same issue instead of creating new ones

Following these rules keeps the CI pipeline stable and repeatable.
