# fetch-gh-repos.mjs

Fetches repositories from GitHub for a given user and generates markdown files in `content/tools` containing repository metadata. Only repositories tagged with the `tool` topic are processed.

## Environment Variables

- `GH_TOKEN` – **required**. GitHub token used to authenticate API calls.
- `GH_USER` – optional override for the user whose repositories are fetched. Defaults to the user associated with `GH_TOKEN`.
- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Pass `--dry-run` to list repositories without writing files.

Run manually with:

```bash
GH_TOKEN=ghp_yourtoken GH_USER=octocat node scripts/fetch-gh-repos.mjs
GH_TOKEN=ghp_yourtoken node scripts/fetch-gh-repos.mjs --dry-run
```

Example output:

```text
[INFO] Wrote content/tools/example-repo.md
```
