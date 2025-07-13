import path from 'path';
import { pathToFileURL } from 'url';
import { githubFetch } from './utils/github.mjs'; // Import the new utility
import { log } from './utils/logger.mjs';
import { mkdir, writeFile } from './utils/file-utils.mjs';
import { TOOLS_DIR } from './utils/constants.mjs';

// Determine the GitHub username for the current token
async function getLogin() {
  if (process.env.GH_USER) return process.env.GH_USER;
  const data = await githubFetch('https://api.github.com/user'); // Use githubFetch
  return data.login;
}

// Fetch all repositories owned by the given login, paging as needed
async function fetchRepos(login) {
  const repos = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const url = `https://api.github.com/users/${login}/repos?per_page=${perPage}&page=${page}`;
    const data = await githubFetch(url); // Use githubFetch
    if (!Array.isArray(data)) {
      log.error(`Invalid response fetching repos: ${JSON.stringify(data)}`);
      break;
    }
    repos.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }
  return repos;
}

// Convert GitHub repo metadata to a markdown front matter block
function repoToMarkdown(repo) {
  const frontmatter = `---\ntitle: ${repo.name}\nrepo: ${repo.html_url}\ndescription: ${repo.description ? repo.description.replace(/\n/g, ' ') : ''}\nupdated: ${repo.updated_at}\n---\n`;
  return frontmatter;
}

// Fetch repos tagged "tool" and write one markdown file per repo
async function main() {
  const argv = process.argv.slice(2);
  const dryIndex = argv.indexOf('--dry-run');
  const dryRun = dryIndex !== -1;
  if (dryRun) argv.splice(dryIndex, 1);

  if (!process.env.GH_TOKEN) {
    log.error('GH_TOKEN not set; skipping fetch-gh-repos');
    return;
  }
  const login = await getLogin();
  const repos = await fetchRepos(login);
  const tools = repos.filter(
    (r) => Array.isArray(r.topics) && r.topics.includes('tool')
  );

  const dir = TOOLS_DIR;
  if (dryRun) {
    log.info(`[DRY] Would create directory ${dir}`);
  } else {
    try {
      await mkdir(dir, { recursive: true });
    } catch (err) {
      log.error(`Error creating directory ${dir}:`, err.message);
      throw err;
    }
  }

  for (const repo of tools) {
    const md = repoToMarkdown(repo);
    const filePath = path.join(dir, `${repo.name}.md`);
    try {
      if (dryRun) {
        log.info(`[DRY] Would write ${filePath}`);
      } else {
        await writeFile(filePath, md);
        log.info(`Wrote ${filePath}`);
      }
    } catch (err) {
      log.error(`Error writing file ${filePath}:`, err.message);
    }
  }
}

export { getLogin, fetchRepos, repoToMarkdown, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('fetch-gh-repos main error:', err);
    process.exit(1);
  });
}
