import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import lunr from 'lunr';
import matter from 'gray-matter';
import { log } from './utils/logger.mjs';

async function collectMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectMarkdown(res)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(res);
    }
  }
  return files;
}

function slugify(filePath) {
  const relative = filePath.replace(/^content\//, '');
  return '/' + relative.replace(/\.md$/, '') + '/';
}

async function main() {
  const files = await collectMarkdown('content');
  const docs = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    docs.push({
      url: slugify(file),
      title: data.title || path.basename(file, '.md'),
      body: content,
    });
  }

  const idx = lunr(function () {
    this.ref('url');
    this.field('title');
    this.field('body');
    docs.forEach((doc) => this.add(doc));
  });

  const output = { index: idx.toJSON(), docs };
  await fs.mkdir('public', { recursive: true });
  await fs.writeFile('public/search-index.json', JSON.stringify(output));
  log.info('Wrote public/search-index.json');
}

export { collectMarkdown, slugify, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('build-search-index main error:', err);
    process.exit(1);
  });
}
