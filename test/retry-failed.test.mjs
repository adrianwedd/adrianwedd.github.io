import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../scripts/classify-inbox.mjs', () => ({
  classifyFile: vi.fn(),
  moveFile: vi.fn(),
  getDynamicSections: vi.fn(),
}));
vi.mock('../scripts/build-insights.mjs', () => ({
  processMarkdownFile: vi.fn(),
}));

import { classifyFile, moveFile, getDynamicSections } from '../scripts/classify-inbox.mjs';
import { processMarkdownFile } from '../scripts/build-insights.mjs';
import { main } from '../scripts/retry-failed.mjs';

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-key';
  vi.restoreAllMocks();
  fs.readdir.mockImplementation((dir) => {
    if (dir === 'content/inbox/failed') return Promise.resolve(['file1.txt']);
    if (dir === 'content/insights-failed') return Promise.resolve(['note.md']);
    return Promise.resolve([]);
  });
  getDynamicSections.mockResolvedValue(['garden']);
  classifyFile.mockResolvedValue({
    section: 'garden',
    tags: [],
    confidence: 0.9,
    reasoning: 'ok',
  });
  moveFile.mockResolvedValue('content/garden/file1.txt');
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENAI_API_KEY;
});

describe('retry-failed.mjs', () => {
  it('processes failed inbox and insight files', async () => {
    await main();
    expect(classifyFile).toHaveBeenCalledWith('content/inbox/failed/file1.txt');
    expect(moveFile).toHaveBeenCalledWith(
      'content/inbox/failed/file1.txt',
      'content/garden',
      [],
      false,
      { status: 'draft' }
    );
    expect(classifyFile).toHaveBeenCalledWith('content/insights-failed/note.md');
    expect(moveFile).toHaveBeenCalledWith(
      'content/insights-failed/note.md',
      'content/garden',
      [],
      false,
      { status: 'draft' }
    );
    expect(processMarkdownFile).toHaveBeenCalledWith('content/garden/file1.txt', false);
  });

  it('skips when API key missing', async () => {
    delete process.env.OPENAI_API_KEY;
    await main();
    expect(fs.readdir).not.toHaveBeenCalled();
  });
});
