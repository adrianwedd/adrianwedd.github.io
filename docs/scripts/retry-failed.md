# retry-failed.mjs

Attempts to recover files that previously failed automated processing. The script scans `content/inbox/failed` and `content/insights-failed`, then re-runs classification and insight generation using the same logic as `classify-inbox.mjs` and `build-insights.mjs`.

For inbox failures it reclassifies the file and moves it to the correct section, `review-needed`, or `untagged`. For insight failures it first reclassifies the file, moves it accordingly, and then generates an insight next to the new location.

## Environment Variables

- `OPENAI_API_KEY` – **required** for contacting the OpenAI API.
- `OPENAI_MODEL` – optional model name (defaults to `gpt-3.5-turbo-1106`).
- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Pass `--dry-run` to log intended actions without moving or writing files.

Run manually with:

```bash
OPENAI_API_KEY=sk-test node scripts/retry-failed.mjs
OPENAI_API_KEY=sk-test node scripts/retry-failed.mjs --dry-run
```

Example output:

```text
[INFO] Reclassified file1.txt -> content/garden/file1.txt
[INFO] Moved note.md -> content/garden/note.md
```
