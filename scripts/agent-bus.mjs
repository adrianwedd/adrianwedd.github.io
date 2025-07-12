import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'yaml';
import { githubFetch } from './utils/github.mjs'; // Import the new utility
import { log } from './utils/logger.mjs';


// Read YAML manifest files from the given directory
// Returns an array of parsed manifest objects
async function loadManifests(dir = path.join('content', 'agents')) {
  let files = [];
  try {
    files = await fs.readdir(dir);
  } catch (err) {
    log.error(`Error reading agent manifests directory ${dir}:`, err.message);
    return [];
  }
  const manifests = [];
  for (const file of files) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    try {
      const data = await fs.readFile(path.join(dir, file), 'utf8');
      const doc = parse(data);
      manifests.push({ file, ...doc });
    } catch (err) {
      log.error(
        `Error reading or parsing agent manifest ${file}:`,
        err.message
      );
    }
  }
  return manifests;
}

// Convert manifest objects to a simple markdown table for the GitHub issue body
function manifestsToMarkdown(manifests) {
  if (manifests.length === 0) return 'No agents found.';
  const headerRows = [
    '| id | status | last updated | owner | role |',
    '|---|---|---|---|---|',
  ];
  let md = headerRows.join('\n') + '\n';
  for (const m of manifests) {
    md += `| ${m.id} | ${m.status} | ${m.last_updated} | ${m.owner || ''} | ${m.role || ''} |
`;
  }
  return md;
}

// Look up an open issue by title and return its number if found
async function getIssueNumber(title, owner, repo) {
  const issues = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?per_page=100&state=open`
  );
  const found = issues.find(
    (i) => i.title.toLowerCase() === title.toLowerCase()
  );
  return found ? found.number : null;
}

// Create a new issue with the specified title and body
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

// Update an existing issue body in place
async function updateIssue(number, body, owner, repo) {
  await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ body }),
    }
  );
}

// Entry point when run as a script: update or create the agent bus issue
async function main() {
  if (!process.env.GH_TOKEN) {
    log.error('GH_TOKEN not set; skipping agent-bus update');
    return;
  }
  const repoEnv = process.env.GH_REPO || process.env.GITHUB_REPOSITORY;
  if (!repoEnv) {
    throw new Error('GH_REPO or GITHUB_REPOSITORY not set');
  }
  const [owner, repo] = repoEnv.split('/');
  const manifests = await loadManifests();
  const body = manifestsToMarkdown(manifests);
  const title = 'agent-bus';
  const num = await getIssueNumber(title, owner, repo);
  if (num) {
    await updateIssue(num, body, owner, repo);
    log.info(`Updated issue #${num}`);
  } else {
    const newNum = await createIssue(title, body, owner, repo);
    log.info(`Created issue #${newNum}`);
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
    log.error('agent-bus main error:', err);
    process.exit(1);
  });
}
