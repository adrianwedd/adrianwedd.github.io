# Personal Intelligence Node

This project hosts Adrian Wedd's static knowledge hub built with [Astro](https://astro.build/). GitHub Actions handle all data processing so the published site remains a simple static deployment on the `gh-pages` branch.

## Repository Structure

- `content/` – Markdown content organised by section
- `scripts/` – Node.js automation scripts used by the CI pipeline
- `.github/workflows/` – CI configuration for building and deploying the site
- `docs/` – Additional architecture and script documentation

## Environment Variables

The CI pipeline expects several secrets configured under **GitHub repository settings → Secrets**:

| Name                | Used By                           | Purpose                            |
| ------------------- | --------------------------------- | ---------------------------------- |
| `GH_TOKEN`          | fetch-gh-repos.mjs, agent-bus.mjs | Minimal GitHub token for API calls |
| `OPENAI_API_KEY`    | classify-inbox.mjs                | Access to OpenAI API               |
| `SLACK_WEBHOOK_URL` | deploy workflow                   | Post CI failure notifications      |

Set these as secrets before running the workflows.

## Development

Install dependencies and run the dev server:

```bash
npm ci
npm run dev
```

Run the automated tests with:

```bash
npm test
```

Lint all files and automatically fix issues with:

```bash
npm run lint
```

Format the codebase using Prettier:

```bash
npm run format
```

See `docs/scripts` for details on each automation script. For troubleshooting CI failures, consult [docs/DEBUGGING.md](docs/DEBUGGING.md).

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
