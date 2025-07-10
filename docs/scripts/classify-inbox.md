# classify-inbox.mjs

Reads files from `content/inbox`, asks OpenAI to determine which section they belong to, and moves them into the appropriate directory. Files that cannot be confidently classified are moved to `content/untagged`.

## Environment Variables

- `OPENAI_API_KEY` – **required** for contacting the OpenAI API.
- `OPENAI_MODEL` – optional model name (defaults to `gpt-3.5-turbo-1106`).

Run manually with:

```bash
OPENAI_API_KEY=sk-test node scripts/classify-inbox.mjs
```

Place a markdown file in `content/inbox/` before running.

Example output:

```text
[INFO] Moved note.md to content/garden/note.md
```
