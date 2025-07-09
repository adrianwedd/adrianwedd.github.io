import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { githubFetch } from './utils/github.mjs'; // Import the new utility

async function getLogin() {
  if (process.env.GH_USER) return process.env.GH_USER;
  const data = await githubFetch('https://api.github.com/user'); // Use githubFetch
  return data.login;
}

async function fetchRepos(login) {
  const repos = [];
  let page = 1;
  const perPage = 100;
  for (;;) {
    const url = `https://api.github.com/users/${login}/repos?per_page=${perPage}&page=${page}`;
    const data = await githubFetch(url); // Use githubFetch
    repos.push(...data);
    if (data.length < perPage) break;
    page += 1;
  }
  return repos;
}

function repoToMarkdown(repo) {
  const frontmatter = `---\ntitle: ${repo.name}\nrepo: ${repo.html_url}\ndescription: ${repo.description ? repo.description.replace(/\n/g, ' ') : ''}\nupdated: ${repo.updated_at}\n---\n`;
  return frontmatter;
}

async function main() {
  const login = await getLogin();
  const repos = await fetchRepos(login);
  const tools = repos.filter(
    (r) => Array.isArray(r.topics) && r.topics.includes('tool')
  );

  const dir = path.join('content', 'tools');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${dir}:`, err.message);
    // Depending on severity, might want to exit or throw here
    return;
  }

  for (const repo of tools) {
    const md = repoToMarkdown(repo);
    const filePath = path.join(dir, `${repo.name}.md`);
    try {
      await fs.writeFile(filePath, md);
      console.log(`Wrote ${filePath}`);
    } catch (err) {
      console.error(`Error writing file ${filePath}:`, err.message);
    }
  }
}

export { getLogin, fetchRepos, repoToMarkdown, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
