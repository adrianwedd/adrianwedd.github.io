# classify-inbox.mjs

Reads files from `content/inbox`, asks OpenAI to determine which section they belong to, and moves them into the appropriate directory. Files that cannot be confidently classified are moved to `content/untagged`.

To avoid concurrent runs processing the same file, the script creates a `.lock` file next to each inbox file during processing. If a lock file already exists, that item is skipped. The lock file is removed once the file has been moved.

## Environment Variables

- `OPENAI_API_KEY` – **required** for contacting the OpenAI API.
- `OPENAI_MODEL` – optional model name (defaults to `gpt-3.5-turbo-1106`).
- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Pass `--dry-run` to preview actions without moving files.

Run manually with:

```bash
OPENAI_API_KEY=sk-test node scripts/classify-inbox.mjs
OPENAI_API_KEY=sk-test node scripts/classify-inbox.mjs --dry-run
```

Place a markdown file in `content/inbox/` before running.

Example output:

```text
[INFO] Moved note.md to content/garden/note.md
```
