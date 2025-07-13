# Automation Scripts


This directory contains documentation for the Node.js scripts that run during the CI workflow. Each script is written in ESM and executed with Node 20.
All pages include example commands and sample output so you can reproduce the results locally.

All scripts respect a `LOG_LEVEL` environment variable. Set it to `DEBUG`, `INFO`, `WARN` or `ERROR` to control verbosity (default: `INFO`).
Pass `--dry-run` to preview actions without making changes.

| Script               | Description                                                              | Environment Variables                     |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| `fetch-gh-repos.mjs` | Fetches public repositories from GitHub and creates tool markdown files. | `GH_TOKEN`, optional `GH_USER`            |
| `classify-inbox.mjs` | Uses OpenAI to categorise files dropped into `content/inbox`.            | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |
| `build-insights.mjs` | Summarises changed markdown files, validates the summary with `markdownlint`, and writes `.insight.md` outputs (failed files move to `content/insights-failed/`). | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |
| `build-search-index.mjs` | Builds `public/search-index.json` for site search. | none |
| `build-rss.mjs` | Generates `public/rss.xml` from markdown metadata. | optional `BASE_URL` (defaults to `https://adrianwedd.github.io`) |
| `agent-bus.mjs`      | Aggregates agent manifests and posts a summary issue on GitHub.          | `GH_TOKEN`, optional `GH_REPO`            |
| `check-dns.mjs`      | Verifies A and CNAME records for the custom domain from `CNAME`. | none |

See the individual files below for further details.

- [build-search-index.mjs](build-search-index.md) – builds `public/search-index.json` for Lunr search.
- [build-rss.mjs](build-rss.md) – generates the site's RSS feed.
