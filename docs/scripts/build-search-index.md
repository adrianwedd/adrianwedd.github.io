# build-search-index.mjs

Creates a Lunr.js search index from markdown files under `content/` and writes it to `public/search-index.json`.

The script walks the `content` directory recursively, streaming files one at a time. Each file's title and body is indexed with `gray-matter` and Lunr, while only minimal metadata is kept in memory. The final JSON is written via a Node stream to keep memory usage low.

## Environment Variables

None.

Run manually with:

```bash
node scripts/build-search-index.mjs
```

Example output:

```text
[INFO] Wrote public/search-index.json
```
