import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'yaml';
import { githubFetch } from './utils/github.mjs'; // Import the new utility

const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY;

async function loadManifests(dir = path.join('content', 'agents')) {
  const files = await fs.readdir(dir);
  const manifests = [];
  for (const file of files) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    const data = await fs.readFile(path.join(dir, file), 'utf8');
    const doc = parse(data);
    manifests.push({ file, ...doc });
  }
  return manifests;
}

function manifestsToMarkdown(manifests) {
  if (manifests.length === 0) return 'No agents found.';
  let md =
    '| id | status | last updated | owner | role |\n|---|---|---|---|---|\n';
  for (const m of manifests) {
    md += `| ${m.id} | ${m.status} | ${m.last_updated} | ${m.owner || ''} | ${m.role || ''} |\n`;
  }
  return md;
}

async function getIssueNumber(title, owner, repo) {
  const issues = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?per_page=100&state=open`
  );
  const found = issues.find(
    (i) => i.title.toLowerCase() === title.toLowerCase()
  );
  return found ? found.number : null;
}

async function createIssue(title, body, owner, repo) {
  const issue = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      body: JSON.stringify({ title, body }),
    }
  );
  return issue.number;
}

async function updateIssue(number, body, owner, repo) {
  await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }
  );
}

async function main() {
  if (!REPO) throw new Error('GH_REPO or GITHUB_REPOSITORY not set'); // Moved check here
  const [owner, repo] = REPO.split('/');
  const manifests = await loadManifests();
  const body = manifestsToMarkdown(manifests);
  const title = 'agent-bus';
  const num = await getIssueNumber(title, owner, repo);
  if (num) {
    await updateIssue(num, body, owner, repo);
    console.log(`Updated issue #${num}`);
  } else {
    const newNum = await createIssue(title, body, owner, repo);
    console.log(`Created issue #${newNum}`);
  }
}

export {
  loadManifests,
  manifestsToMarkdown,
  getIssueNumber,
  createIssue,
  updateIssue,
  main,
};

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
