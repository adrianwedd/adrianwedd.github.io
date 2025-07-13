# build-rss.mjs

Generates an RSS 2.0 feed from all markdown files under `content/` and writes it to `public/rss.xml`.

This script walks the `content` directory recursively, reads front-matter using `gray-matter`, and sorts entries by their `date` field (or file modification time). The output RSS contains basic metadata like title, link, description and publication date.

## Environment Variables

- `BASE_URL` – optional root URL for the feed. Defaults to `https://adrianwedd.github.io`.
- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Pass `--dry-run` to preview the RSS path without writing the file.

Run manually with:

```bash
BASE_URL=https://example.com node scripts/build-rss.mjs
BASE_URL=https://example.com node scripts/build-rss.mjs --dry-run
```

Example output:

```text
Wrote public/rss.xml
```
