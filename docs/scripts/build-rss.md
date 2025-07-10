# build-rss.mjs

Generates an RSS 2.0 feed from all markdown files under `content/` and writes it to `public/rss.xml`.

This script walks the `content` directory recursively, reads front-matter using `gray-matter`, and sorts entries by their `date` field (or file modification time). The output RSS contains basic metadata like title, link, description and publication date.

No required environment variables. Optionally set `BASE_URL` to override the root URL in the feed (defaults to `https://adrianwedd.github.io`). You can run the script manually with:

```bash
BASE_URL=https://example.com node scripts/build-rss.mjs
```

Example output:

```text
Wrote public/rss.xml
```
