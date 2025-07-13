import fs from 'fs/promises';
import { createWriteStream } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import lunr from 'lunr';
import matter from 'gray-matter';
import { log } from './utils/logger.mjs';
import { CONTENT_DIR, PUBLIC_DIR } from './utils/constants.mjs';

// Async generator walking markdown files for indexing
async function* walkMarkdown(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const res = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkMarkdown(res);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      yield res;
    }
  }
}

// Convert a markdown path into a site-relative URL
function slugify(filePath) {
  const relative = filePath.replace(new RegExp(`^${CONTENT_DIR}/`), '');
  return '/' + relative.replace(/\.md$/, '') + '/';
}

// Build lunr.js index and write to public/search-index.json
async function main() {
  const argv = process.argv.slice(2);
  const dryIndex = argv.indexOf('--dry-run');
  const dryRun = dryIndex !== -1;
  if (dryRun) argv.splice(dryIndex, 1);

  const builder = new lunr.Builder();
  builder.ref('url');
  builder.field('title');
  builder.field('body');

  const docs = [];
  for await (const file of walkMarkdown(CONTENT_DIR)) {
    const raw = await fs.readFile(file, 'utf8');
    const { data, content } = matter(raw);
    const meta = {
      url: slugify(file),
      title: data.title || path.basename(file, '.md'),
    };
    builder.add({ ...meta, body: content });
    docs.push(meta);
  }

  const idx = builder.build();

  const outPath = path.join(PUBLIC_DIR, 'search-index.json');
  if (dryRun) {
    log.info(`[DRY] Would write ${outPath}`);
  } else {
    await fs.mkdir(PUBLIC_DIR, { recursive: true });
    const stream = createWriteStream(outPath);
    stream.write('{"index":');
    stream.write(JSON.stringify(idx.toJSON()));
    stream.write(',"docs":');
    stream.write(JSON.stringify(docs));
    stream.write('}');
    await new Promise((resolve) => stream.end(resolve));
    log.info(`Wrote ${outPath}`);
  }
}

export { walkMarkdown, slugify, main };

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    log.error('build-search-index main error:', err);
    process.exit(1);
  });
}
