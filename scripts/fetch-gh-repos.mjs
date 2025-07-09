import fs from 'fs/promises';
import path from 'path';

const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) {
  console.error('GH_TOKEN environment variable is required');
  process.exit(1);
}

const headers = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${GH_TOKEN}`,
};

async function getLogin() {
  if (process.env.GH_USER) return process.env.GH_USER;
  const res = await fetch('https://api.github.com/user', { headers });
  if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
  const data = await res.json();
  return data.login;
}

async function fetchRepos(login) {
  const repos = [];
  let page = 1;
  const perPage = 100;
  while (true) {
    const url = `https://api.github.com/users/${login}/repos?per_page=${perPage}&page=${page}`;
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`Failed to fetch repos page ${page}: ${res.status}`);
    const data = await res.json();
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
  const tools = repos.filter(r => Array.isArray(r.topics) && r.topics.includes('tool'));

  const dir = path.join('content', 'tools');
  await fs.mkdir(dir, { recursive: true });

  await Promise.all(tools.map(async (repo) => {
    const md = repoToMarkdown(repo);
    const filePath = path.join(dir, `${repo.name}.md`);
    await fs.writeFile(filePath, md);
    console.log(`Wrote ${filePath}`);
  }));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

