# GitHub Pages Troubleshooting

This guide outlines common checks when your site returns a 404 error.

1. **GitHub Status** – confirm `https://www.githubstatus.com` reports no active incidents.
2. **DNS Records** – run `node scripts/check-dns.mjs` to verify the domain in `CNAME` resolves to GitHub Pages IPs or a `github.io` CNAME.
3. **Browser Cache** – clear your browser cache if the repository is private and you still see outdated content.
4. **Entry File** – ensure the repository's publishing source contains an `index.html` or `index.md` at the top level. The Astro build outputs `dist/index.html` which is deployed to the `gh-pages` branch.
5. **Publishing Source** – confirm the repository settings point GitHub Pages at the `gh-pages` branch.
6. **Custom Domain** – if using a custom domain, verify a `CNAME` file exists with the correct hostname.
7. **GitHub Actions** – check the `deploy.yml` workflow completes successfully and that a `.nojekyll` file is present if you disable Actions.

Running through these steps locally can help diagnose deployment issues before opening a community discussion.
