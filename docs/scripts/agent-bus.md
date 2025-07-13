# agent-bus.mjs

Reads all YAML agent manifests in `content/agents`, aggregates their status, and posts a summary table to a GitHub Issue titled `agent-bus`.

## Environment Variables

- `GH_TOKEN` – **required** token for creating or updating issues.
- `GH_REPO` – optional `owner/repo` override. Defaults to `GITHUB_REPOSITORY`.
- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Run manually with:

```bash
GH_TOKEN=ghp_yourtoken GH_REPO=owner/repo node scripts/agent-bus.mjs
```

Example output:

```text
[INFO] Created issue #12
```
