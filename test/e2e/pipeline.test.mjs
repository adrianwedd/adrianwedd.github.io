import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

// Mock LLM API
vi.mock('../../scripts/utils/llm-api.mjs', () => ({
  callOpenAI: vi.fn(),
}));

import { callOpenAI } from '../../scripts/utils/llm-api.mjs';
import { main as classifyMain } from '../../scripts/classify-inbox.mjs';
import { main as insightsMain } from '../../scripts/build-insights.mjs';

const fixtureDir = path.resolve('test', 'fixtures');

describe('E2E: classify inbox then build insights', () => {
  let tmpDir;
  let origCwd;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pin-e2e-'));
    origCwd = process.cwd();
    process.chdir(tmpDir);

    // init git repo to mimic repository
    execSync('git init', { cwd: tmpDir });

    // create directory structure
    await fs.mkdir(path.join('content', 'inbox'), { recursive: true });
    await fs.mkdir(path.join('content', 'garden'), { recursive: true });
    await fs.mkdir(path.join('content', 'logs'), { recursive: true });
    await fs.mkdir(path.join('content', 'mirror'), { recursive: true });
    await fs.mkdir(path.join('content', 'untagged'), { recursive: true });

    // copy fixture inbox files
    const inboxSrc = path.join(fixtureDir, 'inbox');
    const files = await fs.readdir(inboxSrc);
    for (const file of files) {
      const data = await fs.readFile(path.join(inboxSrc, file));
      await fs.writeFile(path.join('content', 'inbox', file), data);
    }

    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(async () => {
    process.chdir(origCwd);
    await fs.rm(tmpDir, { recursive: true, force: true });
    delete process.env.OPENAI_API_KEY;
    vi.restoreAllMocks();
  });

  it('moves files and creates insight markdown', async () => {
    // classification mock
    callOpenAI.mockImplementation((prompt) => {
      if (prompt.includes('garden note')) {
        return Promise.resolve(
          JSON.stringify({ section: 'garden', tags: ['plants'], confidence: 0.9 })
        );
      }
      if (prompt.includes('Log entry')) {
        return Promise.resolve(
          JSON.stringify({ section: 'logs', tags: ['daily'], confidence: 0.9 })
        );
      }
      return Promise.resolve(
        JSON.stringify({ section: 'untagged', tags: [], confidence: 0.4 })
      );
    });

    await classifyMain();

    // verify moves
    await expect(
      fs.stat(path.join('content', 'garden', 'test-doc-garden.md'))
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join('content', 'logs', 'test-doc-log.md'))
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join('content', 'untagged', 'test-doc-untagged.txt'))
    ).resolves.toBeDefined();

    // insight generation mock
    callOpenAI.mockResolvedValue('# Summary\n\nConcise summary\n');
    await insightsMain();

    // verify insights created
    await expect(
      fs.stat(path.join('content', 'garden', 'test-doc-garden.insight.md'))
    ).resolves.toBeDefined();
    await expect(
      fs.stat(path.join('content', 'logs', 'test-doc-log.insight.md'))
    ).resolves.toBeDefined();
  });
});
