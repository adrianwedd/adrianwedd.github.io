# Known Issues

This file lists the main technical challenges currently affecting the Personal Intelligence Node project.

- **Vitest mocking complexity** – tests that mock imported modules can behave unpredictably. See `GEMINI.md` for details on recent troubleshooting steps.
- **Secrets on forked PRs** – GitHub Actions do not expose repository secrets to workflows triggered from forks. Scripts relying on `GH_TOKEN` or `OPENAI_API_KEY` will log warnings instead of failing, but some functionality is skipped. See [docs/DEBUGGING.md](DEBUGGING.md).
- **Fragile LLM responses** – the classification and insight scripts expect valid JSON from OpenAI. Malformed or truncated replies cause files to be moved to a failed folder for manual review.
- **Missing directories** – many scripts assume directories like `content/inbox` exist. If they are absent, `ENOENT` errors occur during CI runs.
- **Pending test coverage improvements** – integration tests are partially disabled and several tasks track adding edge case scenarios. See `tasks.yml` around IDs 68–70.

These issues are tracked in `tasks.yml` and will be updated as they are resolved.
