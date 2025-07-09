# build-rss.mjs

Generates an RSS 2.0 feed from all markdown files under `content/` and writes it to `public/rss.xml`.

This script walks the `content` directory recursively, reads front-matter using `gray-matter`, and sorts entries by their `date` field (or file modification time). The output RSS contains basic metadata like title, link, description and publication date.

No environment variables are required. You can run the script manually with:

```bash
node scripts/build-rss.mjs
```
