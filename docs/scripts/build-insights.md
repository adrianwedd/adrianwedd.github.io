# build-insights.mjs

Generates short summaries for markdown files in the content directories. The script automatically discovers subfolders under `content/` (excluding `inbox` and `untagged`) and processes any markdown files it finds. Each original file is paired with a new `<name>.insight.md` file containing the summary.

The script accepts a comma-separated list of changed files as its first argument. If none are provided it scans the target directories. For every markdown file found (excluding existing `.insight.md` files) the contents are sent to OpenAI via `callOpenAI`. The resulting text is written next to the source file.

After a summary is generated, it is validated with `markdownlint`. If the summary fails linting, the original file is moved to `content/insights-failed/` for manual review and the insight file is not created.

Output is logged with `[INFO]`, `[WARN]`, and `[ERROR]` prefixes via `logger.mjs`.

## Environment Variables

- `OPENAI_API_KEY` – **required** for contacting the OpenAI API.
- `OPENAI_MODEL` – optional model name (defaults to `gpt-3.5-turbo-1106`).

Run manually with:

```bash
node scripts/build-insights.mjs
```
