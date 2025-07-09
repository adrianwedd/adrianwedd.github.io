# Debugging CI/CD Workflows

This guide collects tips for diagnosing failures in the GitHub Actions pipeline and running scripts locally.

## Common Failure Scenarios

- **Missing environment variables** – most scripts rely on secrets like `GH_TOKEN` or `OPENAI_API_KEY`. Ensure these are configured under *Settings → Secrets* in the repository.
- **Secrets unavailable on forks** – GitHub does not expose repository secrets to workflows triggered from forked pull requests. Scripts that rely on `GH_TOKEN` will now log `GH_TOKEN not set; skipping` instead of failing.
- **File not found errors** – check that expected paths exist (e.g. `content/inbox` or `content/tools`).
- **Malformed LLM responses** – the `classify-inbox` script expects valid JSON from OpenAI. A broken or truncated response will cause it to skip files.
- **Dependency issues** – if a script cannot find a package, run `npm ci` to install all dependencies exactly as defined in `package-lock.json`.

## Reading Workflow Logs

1. Open the **Actions** tab on GitHub and select the failing workflow run.
2. Expand the job with the red ❌ icon to view the failing step.
3. Click **Show logs** to inspect console output. Errors usually mention which script failed.
4. Cross‑reference the script name with the documentation in `docs/scripts` for troubleshooting tips.

## Running Scripts Locally

1. Install dependencies with `npm ci`.
2. Export any required environment variables, for example:
   ```bash
   export GH_TOKEN=...
   export OPENAI_API_KEY=...
   ```
3. Execute the script directly using Node 20:
   ```bash
   node scripts/<script>.mjs
   ```
   Replace `<script>` with the file you want to test, such as `classify-inbox`.
4. Check the terminal output for errors and iterate until the command succeeds.

Running scripts locally mirrors the CI environment and helps isolate issues before pushing commits.
