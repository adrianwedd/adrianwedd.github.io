# check-dns.mjs

Checks DNS records for the custom domain listed in the `CNAME` file. The script verifies that the domain resolves to GitHub Pages by looking for either the standard A records or a CNAME pointing to `*.github.io`.

## Environment Variables

None.

Run manually with:

```bash
node scripts/check-dns.mjs
```

Example output:

```text
[INFO] DNS PASS for github.adrianwedd.com
```
