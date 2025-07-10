# build-insights.mjs

Generates `.insight.md` files summarising markdown content with an LLM. The summary text is sanitised with `sanitize-html` before writing to disk to prevent malicious HTML from ending up on the site.

Requires `OPENAI_API_KEY` and optionally `OPENAI_MODEL`.
