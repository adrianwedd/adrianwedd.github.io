# Automation Scripts

This directory contains documentation for the Node.js scripts that run during the CI workflow. Each script is written in ESM and executed with Node 20.

| Script | Description | Environment Variables |
|--------|-------------|----------------------|
| `fetch-gh-repos.mjs` | Fetches public repositories from GitHub and creates tool markdown files. | `GH_TOKEN`, optional `GH_USER` |
| `classify-inbox.mjs` | Uses OpenAI to categorise files dropped into `content/inbox`. | `OPENAI_API_KEY`, optional `OPENAI_MODEL` |
| `build-insights.mjs` | Placeholder for generating periodic insights from content. | none |
| `agent-bus.mjs` | Aggregates agent manifests and posts a summary issue on GitHub. | `GH_TOKEN`, optional `GH_REPO` |

See the individual files below for further details.
