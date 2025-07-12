# Agent Guidelines

This repository houses the **Personal Intelligence Node** project. Agents working here should observe the following principles:

1. **Documentation First** – keep `PLAN.md` and `tasks.yml` up to date when scopes change.
2. **No Secrets in Code** – API keys and tokens must be added as repository secrets for GitHub Actions.
3. **Static Only** – the deployed site must remain a fully static GitHub Pages build (currently using Astro as described in `PLAN.md`).
4. **Script Style** – Node scripts are written in ESM syntax (`.mjs`) and should pass `node --experimental-specifier-resolution=node` if needed. Use modern JavaScript and avoid deprecated APIs.
5. **Testing** – Vitest tests live in the `test/` directory and must be run before committing.
6. **Pull Requests** – when opening a PR, summarise major changes and reference relevant sections of `PLAN.md`.

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
