import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import matter from 'gray-matter';
import { log } from './utils/logger.mjs';
import { CONTENT_DIR, PUBLIC_DIR } from './utils/constants.mjs';

const BASE_URL = process.env.BASE_URL || 'https://adrianwedd.github.io';

// Recursively gather markdown files under a directory
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

// Convert a markdown file path in content/ to a URL slug
function slugify(filePath) {
  const relative = filePath.replace(new RegExp(`^${CONTENT_DIR}/`), '');
  return '/' + relative.replace(/\.md$/, '') + '/';
}

// Escape XML special characters for RSS output
function escape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Build a minimal RSS 2.0 feed from a list of items
function buildXml(items) {
  const lines = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<rss version="2.0">');
  lines.push('<channel>');
  lines.push('<title>Personal Intelligence Node</title>');
  lines.push(`<link>${BASE_URL}/</link>`);
  lines.push('<description>Recent updates</description>');
  for (const item of items) {
    lines.push('<item>');
    lines.push(`<title>${escape(item.title)}</title>`);
    lines.push(`<link>${BASE_URL}${item.slug}</link>`);
    lines.push(`<pubDate>${item.date.toUTCString()}</pubDate>`);
    if (item.description) {
      lines.push(`<description>${escape(item.description)}</description>`);
    }
    lines.push('</item>');
  }
  lines.push('</channel>');
  lines.push('</rss>');
  return lines.join('');
}

// Generate rss.xml in the public directory
async function main() {
  const argv = process.argv.slice(2);
  const dryIndex = argv.indexOf('--dry-run');
  const dryRun = dryIndex !== -1;
  if (dryRun) argv.splice(dryIndex, 1);

  const files = await collectMarkdown(CONTENT_DIR);
  const items = [];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    const stats = await fs.stat(file);
    const title = data.title || path.basename(file, '.md');
    const description = data.description || content.split('\n')[0];
    const date = data.date ? new Date(data.date) : stats.mtime;
    items.push({ title, description, slug: slugify(file), date });
  }
  items.sort((a, b) => b.date - a.date);
  const xml = buildXml(items);
  const outPath = path.join(PUBLIC_DIR, 'rss.xml');
  if (dryRun) {
    log.info(`[DRY] Would write ${outPath}`);
  } else {
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    await fs.writeFile(outPath, xml);
    log.info(`Wrote ${outPath}`);
  }
}

export { collectMarkdown, slugify, buildXml, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('build-rss main error:', err);
    process.exit(1);
  });
}
