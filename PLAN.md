# Personal Intelligence Node

## Final Stand-Alone Implementation Plan (GitHub Pages Edition)

**Version 1.0 – ready for Codex / Gemini automation**

---

### 0. Mission & Scope

Build a self-updating, agent-fed, static knowledge hub—a "personal intelligence node" that:
1. Aggregates code, logs, notes, and creative work produced by multiple AI agents.
2. Synthesises periodic insights without server-side runtime (done during CI).
3. Publishes to GitHub Pages using a fully static framework (Astro).
4. Scales via simple file-drop conventions; any agent that can git commit can contribute.

---

### 1. Core Constraints & Solutions

| Limitation (GitHub Pages) | Adopted Strategy |
|---------------------------|------------------|
| No server runtimes / APIs | All processing occurs pre-build in GitHub Actions (CI). |
| No websockets / live data | Agents push updates by committing files; CI rebuilds daily or on demand. |
| Secrets must stay safe    | All external API keys stored as Actions Secrets (never in code). |

---

### 2. Tech Stack Overview

| Layer               | Choice / Notes |
|---------------------|----------------|
| Static Framework    | Astro v4 (output: "static") |
| Styling             | Tailwind CSS v3 |
| Diagrams            | Mermaid.js (client-side) |
| Markdown-with-JS    | MDX (built-in to Astro) |
| CI / CD             | GitHub Actions + JamesIves/github-pages-deploy-action |
| Testing             | Vitest with coverage enforced |
| Agent Scripting     | Node 20 ESM (`*.mjs` scripts) |
| LLM APIs            | OpenAI, Gemini, or other—invoked from CI scripts |

---

### 3. Directory Layout

```
.
├── .github/workflows/     # CI pipelines
├── astro.config.mjs       # Astro static config
├── tailwind.config.cjs
├── scripts/               # Node automation
│   ├── fetch-gh-repos.mjs     # Pull repo metadata → /content/tools/
│   ├── classify-inbox.mjs     # LLM tagging → move from inbox/
│   ├── build-insights.mjs     # Summaries & cross-links
│   └── agent-bus.mjs          # Update #agent-bus issue
├── src/                  # Astro site source
│   ├── layouts/
│   ├── components/
│   └── pages/
├── content/              # **Single source of truth** for site data
│   ├── codex/            # Agent blueprints
│   ├── tools/            # Tool descriptors
│   ├── logs/             # Journals, transcripts
│   ├── garden/           # Zettels, notes
│   ├── mirror/           # Narrative / creative
│   ├── resume/           # JSON + markdown views
│   ├── agents/           # YAML manifests per agent
│   └── inbox/            # Raw drops awaiting classification
└── public/               # Static assets (audio, images, favicon)
```

---

### 3a. Architecture Diagram

See [`docs/architecture.mmd`](docs/architecture.mmd) for a mermaid diagram depicting the data flow between automation scripts, content folders, and the GitHub Actions workflow.

### 3b. Agent Manifest Schema

Agent status files live in `content/agents/` and must conform to the schema in
[`docs/agent-manifest-schema.yml`](docs/agent-manifest-schema.yml). A minimal
example looks like:

```yaml
id: codex-agent
name: Codex Agent
owner: "@adrian"
role: Repository automation
status: active        # active | idle | offline | error
last_updated: 2024-01-01T00:00:00Z
description: Handles GitHub automation tasks.
```

The `agent-bus.mjs` script reads these manifests and updates the `#agent-bus`
GitHub Issue with a summary table.

### 4. Automation Scripts (CI)

| Script               | Purpose                                                                | Invoked By       |
|----------------------|------------------------------------------------------------------------|------------------|
| `fetch-gh-repos.mjs` | Scan GitHub user/org, create `content/tools/<repo>.md` for any repo tagged tool. | Manual & nightly cron |
| `classify-inbox.mjs` | For every file in `content/inbox/`, call LLM → `{section,tags}`; move file accordingly. Confidence < 0.8 ⇒ move to `untagged/`. | Before build step |
| `build-insights.mjs` | Parse new/changed markdown (logs, garden, mirror); generate `<slug>.insight.md` with summary + cross-links. | After classification |
| `agent-bus.mjs`      | Read `content/agents/*.yml`, update or create GitHub Issue `#agent-bus` with latest agent statuses. | Last step in workflow |

---

### 5. GitHub Actions Workflow

```yaml
name: Build & Deploy

on:
  push:
    branches: [main]
  schedule:
    - cron: '0 2 * * *'   # daily UTC-02:00
jobs:
  build:
    runs-on: ubuntu-latest
    env:
      GH_TOKEN: ${{ secrets.GH_TOKEN }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}   # or GEMINI_API_KEY, etc.
    steps:
      - uses: actions/checkout@v4

      - name: Node
        uses: actions/setup-node@v4
        with: { node-version: '20' }

      - run: npm ci
      - run: npm test

      # 1. ingest & classify
      - run: node scripts/fetch-gh-repos.mjs
      - run: node scripts/classify-inbox.mjs
      - run: node scripts/build-insights.mjs
      - run: node scripts/agent-bus.mjs

      # 2. build static site
      - run: npm run build

      # 3. deploy to gh-pages
      - uses: JamesIves/github-pages-deploy-action@v4
        with:
          branch: gh-pages
          folder: dist
```

---

### 6. Secrets to Configure

| Name                    | Used By                               | Permissions Required |
|-------------------------|---------------------------------------|----------------------|
| `GH_TOKEN`              | `fetch-gh-repos.mjs`, `agent-bus.mjs` | repo scope minimal token |
| `OPENAI_API_KEY` / `GEMINI_API_KEY` | Classification & insight scripts | LLM usage only |

(Add more secrets as additional agents/scripts come online.)

---

### 7. Front-End Components (MVP)

| Component            | Directory          | Description |
|----------------------|--------------------|-------------|
| `NavBar.astro`       | `src/components/`  | Dynamic links to site sections. |
| `ToolCard.astro`     | `src/components/`  | Renders tool metadata (title, repo link, description). |
| `AgentDiagram.astro` | `src/components/`  | Mermaid diagram for codex files with `diagram:` front-matter. |
| `ResumeSwitcher.astro` | `src/components/` | Client-side toggle between multiple resume modes. |
| `VoiceLog.astro`     | `src/components/`  | Audio player + transcript display for logs. |

---

### 8. Phased Execution Plan

| Phase | Objective                        | Key Tasks |
|-------|----------------------------------|-----------|
| 1. Bootstrap | Repository + CI running | • Commit scaffold • Configure Pages to `gh-pages`. • Verify manual `npm run dev` / `npm run build`. |
| 2. Automation Hooks | Data ingestion operational | • Add `GH_TOKEN` secret. • Finish & test `fetch-gh-repos.mjs`. • Push – confirm tools page autogenerates. |
| 3. LLM Integration | Classification & insights | • Implement `classify-inbox.mjs` with chosen LLM. • Implement `build-insights.mjs`. • Store API keys in Secrets. • Dry-run on sample inbox files. |
| 4. Process Hardening & Agent Bus | Status visibility & quality gate | • Enforce branch protection on `main` requiring passing checks and one approving review. • Design simple YAML manifest schema. • Implement `agent-bus.mjs` to update Issue. |
| 5. UI Expansion | Flesh out components & pages | • Build ToolCard, AgentDiagram, etc. • Style with Tailwind. • Populate content folders. |
| 6. Iterative Growth | Continuous enhancement | • Add more scripts (dataset stats, changelog diffing). • Hook additional agents via commits. • Refine design/branding. |

---

### 9. Adoption & Re-Use

While built for a single user, the architecture is generic:
- Any contributor can clone the repo, drop content in `inbox/`, commit, and let CI classify.
- The GitHub Issue bus gives human-readable, RSS-capable visibility into agent activity.
- Scripts are modular—replace OpenAI with Gemini CLI or local LLM calls as needed.

---

### 10. Next Action for Codex Agents

1. Clone the repository skeleton.
2. Populate the files exactly per directory layout above.
3. Implement each script stub to spec, ensuring ESLint-clean Node 20 ESM code.
4. Commit and open a PR titled “Phase 1 Bootstrap”.
5. On merge, CI should deploy a working placeholder site at GitHub Pages.

(Subsequent PRs will tackle Phases 2–6.)

---

End of stand-alone plan. Ready for automated execution.

