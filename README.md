# Personal Intelligence Node

This project hosts Adrian Wedd's static knowledge hub built with [Astro](https://astro.build/). GitHub Actions handle all data processing so the published site remains a simple static deployment on the `gh-pages` branch.

Images are optimized at build time using Astro's built-in [`astro:assets`](https://docs.astro.build/en/guides/assets/) pipeline.


## Getting Started

```bash
git clone https://github.com/adrianwedd/adrianwedd.github.io.git
cd adrianwedd.github.io
pnpm install
pnpm test
pnpm run dev
```

## Repository Structure

- `content/` – Markdown content organised by section
- `scripts/` – Node.js automation scripts used by the CI pipeline
- `.github/workflows/` – CI configuration for building and deploying the site
- `docs/` – Additional architecture and script documentation

## Project Architecture

For an overview of the automation pipeline see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Environment Variables

The CI pipeline expects several secrets configured under **GitHub repository settings → Secrets**:

| Name                | Used By                           | Purpose                            |
| ------------------- | --------------------------------- | ---------------------------------- |
| `GH_TOKEN`          | fetch-gh-repos.mjs, agent-bus.mjs | Minimal GitHub token for API calls |
| `OPENAI_API_KEY`    | classify-inbox.mjs                | Access to OpenAI API               |
| `SLACK_WEBHOOK_URL` | deploy workflow                   | Post CI failure notifications      |

Set these as secrets before running the workflows.

## Deployment

Pushing to `main` runs the workflow in `.github/workflows/deploy.yml` which builds the Astro site and publishes `dist` to the `gh-pages` branch. GitHub Pages then serves the site from that branch.


## Development

Install dependencies and run the dev server:

```bash
pnpm install
pnpm run dev
```

Run the automated tests with:

```bash
pnpm test
```

These tests also run automatically in the GitHub Actions workflow to prevent deployments when the automation pipeline fails.

Lint all files and automatically fix issues with:

```bash
pnpm run lint
```

Format the codebase using Prettier:

```bash
pnpm run format
```

See [docs/scripts/README.md](docs/scripts/README.md) for script usage and environment variables. Troubleshooting tips live in [docs/DEBUGGING.md](docs/DEBUGGING.md). Additional steps for Pages errors are in [docs/TROUBLESHOOTING_PAGES.md](docs/TROUBLESHOOTING_PAGES.md). Current technical challenges are summarised in [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
