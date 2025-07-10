import { readFile, readdir } from './utils/file-utils.mjs';
import path from 'path';
import { pathToFileURL } from 'url';
import { parse } from 'yaml';
import { githubFetch } from './utils/github.mjs'; // Import the new utility
import { log } from './utils/logger.mjs';

const REPO = process.env.GH_REPO || process.env.GITHUB_REPOSITORY;

async function loadManifests(dir = path.join('content', 'agents')) {
  let files = [];
  try {
    files = await readdir(dir);
  } catch (err) {
    log.error(
      `Error reading agent manifests directory ${dir}:`,
      err.message
    );
    return [];
  }
  const manifests = [];
  for (const file of files) {
    if (!file.endsWith('.yml') && !file.endsWith('.yaml')) continue;
    try {
      const data = await readFile(path.join(dir, file), 'utf8');
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

function manifestsToMarkdown(manifests) {
  if (manifests.length === 0) return 'No agents found.';
  const header = '| id | status | last updated | owner | role |';
  const separator = '|---|---|---|---|---|';
  let md = `${header}
${separator}
`;
  for (const m of manifests) {
    md += `| ${m.id} | ${m.status} | ${m.last_updated} | ${m.owner || ''} | ${m.role || ''} |
`;
  }
  return md;
}

async function getIssueNumber(title, owner, repo) {
  try {
    const issues = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/issues?per_page=100&state=open`
    );
    const found = issues.find(
      (i) => i.title.toLowerCase() === title.toLowerCase()
    );
    return found ? found.number : null;
  } catch (err) {
    log.error(`Error fetching issue number: ${err.message}`);
    throw err;
  }
}

async function createIssue(title, body, owner, repo) {
  try {
    const issue = await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/issues`,
      {
        method: 'POST',
        body: JSON.stringify({ title, body }),
      }
    );
    return issue.number;
  } catch (err) {
    log.error(`Error creating issue: ${err.message}`);
    throw err;
  }
}

async function updateIssue(number, body, owner, repo) {
  try {
    await githubFetch(
      `https://api.github.com/repos/${owner}/${repo}/issues/${number}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ body }),
      }
    );
  } catch (err) {
    log.error(`Error updating issue #${number}: ${err.message}`);
    throw err;
  }
}

async function main() {
  if (!REPO) {
    log.error('GH_REPO or GITHUB_REPOSITORY not set');
    process.exit(1);
  }
  const [owner, repo] = REPO.split('/');
  let manifests;
  try {
    manifests = await loadManifests();
  } catch (err) {
    log.error(`Failed to load manifests: ${err.message}`);
    process.exit(1);
  }

  const body = manifestsToMarkdown(manifests);
  const title = 'agent-bus';
  let num;
  try {
    num = await getIssueNumber(title, owner, repo);
  } catch (err) {
    log.error(`Failed to get issue number: ${err.message}`);
    process.exit(1);
  }

  try {
    if (num) {
      await updateIssue(num, body, owner, repo);
      log.info(`Updated issue #${num}`);
    } else {
      const newNum = await createIssue(title, body, owner, repo);
      log.info(`Created issue #${newNum}`);
    }
  } catch (err) {
    log.error(`Failed to manage GitHub issue: ${err.message}`);
    process.exit(1);
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
    log.error(err);
    process.exit(1);
  });
}
