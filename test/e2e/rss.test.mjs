import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

vi.mock('../../scripts/utils/llm-api.mjs', () => ({
  callOpenAI: vi.fn(),
}));

import { callOpenAI } from '../../scripts/utils/llm-api.mjs';
import { main as classifyMain } from '../../scripts/classify-inbox.mjs';
import { main as buildRssMain } from '../../scripts/build-rss.mjs';

const fixtureDir = path.resolve('test', 'fixtures');

describe('E2E: classify inbox and generate RSS', () => {
  let tmpDir;
  let origCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pin-e2e-rss-'));
    origCwd = process.cwd();
    process.chdir(tmpDir);

    execSync('git init', { cwd: tmpDir });

    await fs.mkdir(path.join('content', 'inbox'), { recursive: true });
    await fs.mkdir(path.join('content', 'garden'), { recursive: true });
    await fs.mkdir('public', { recursive: true });

    const data = await fs.readFile(
      path.join(fixtureDir, 'inbox', 'test-doc-garden.md')
    );
    await fs.writeFile(path.join('content', 'inbox', 'test-doc-garden.md'), data);

    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it('produces rss.xml for published content', async () => {
    callOpenAI.mockResolvedValue(
      JSON.stringify({
        section: 'garden',
        tags: ['plants'],
        confidence: 0.9,
        reasoning: 'garden note',
      })
    );

    await classifyMain();

    const dest = path.join('content', 'garden', 'test-doc-garden.md');
    let contents = await fs.readFile(dest, 'utf8');
    contents = contents.replace('status: draft', 'status: published');
    await fs.writeFile(dest, contents);

    await buildRssMain();

    const rss = await fs.readFile(path.join('public', 'rss.xml'), 'utf8');
    expect(rss).toContain('/garden/test-doc-garden/');
  });
});
