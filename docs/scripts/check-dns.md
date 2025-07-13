# check-dns.mjs

Checks DNS records for the custom domain listed in the `CNAME` file. The script verifies that the domain resolves to GitHub Pages by looking for either the standard A records or a CNAME pointing to `*.github.io`. It runs automatically each hour via the `DNS Check` GitHub Actions workflow.

## Environment Variables

- `LOG_LEVEL` – optional log verbosity (`DEBUG`, `INFO`, `WARN`, `ERROR`).

Run manually with:

```bash
node scripts/check-dns.mjs
```

Example output:

```text
[INFO] DNS PASS for github.adrianwedd.com
```
