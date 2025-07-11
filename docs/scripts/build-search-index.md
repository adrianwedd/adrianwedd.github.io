# build-search-index.mjs

Creates a Lunr.js search index from markdown files under `content/` and writes it to `public/search-index.json`.

The script walks the `content` directory recursively, reads front matter with `gray-matter`, and indexes each file's title and body for use in client-side search.

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
