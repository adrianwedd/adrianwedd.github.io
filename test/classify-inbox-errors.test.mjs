import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../scripts/utils/llm-api.mjs', () => ({ callOpenAI: vi.fn() }));
vi.mock('../scripts/utils/file-utils.mjs', () => ({ readFileStream: vi.fn() }));
vi.mock('../scripts/utils/sanitize-markdown.mjs', () => ({
  sanitizeMarkdown: (s) => s,
}));

import {
  classifyFile,
  moveFile,
  getDynamicSections,
} from '../scripts/classify-inbox.mjs';
import { callOpenAI } from '../scripts/utils/llm-api.mjs';
import { readFileStream } from '../scripts/utils/file-utils.mjs';

beforeEach(() => {
  vi.restoreAllMocks();
  readFileStream.mockResolvedValue('content');
  fs.writeFile.mockResolvedValue();
  fs.unlink.mockResolvedValue();
  fs.mkdir.mockResolvedValue();
  callOpenAI.mockResolvedValue(
    JSON.stringify({ section: 'garden', tags: [], confidence: 0.9 })
  );
  fs.readdir.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('classify-inbox error paths', () => {
  it('classifyFile throws on read error', async () => {
    readFileStream.mockRejectedValueOnce(new Error('fail'));
    await expect(classifyFile('x')).rejects.toThrow('fail');
  });

  it('classifyFile throws on invalid JSON', async () => {
    callOpenAI.mockResolvedValueOnce('bad');
    await expect(classifyFile('x')).rejects.toThrow('Invalid JSON');
  });

  it('classifyFile throws on missing keys', async () => {
    callOpenAI.mockResolvedValueOnce(JSON.stringify({ section: 'g' }));
    await expect(classifyFile('x')).rejects.toThrow('Malformed response');
  });

  it('classifyFile throws on invalid confidence', async () => {
    callOpenAI.mockResolvedValueOnce(
      JSON.stringify({ section: 'g', tags: [], confidence: 2 })
    );
    await expect(classifyFile('x')).rejects.toThrow('Invalid confidence');
  });

  it('classifyFile throws on invalid tags', async () => {
    callOpenAI.mockResolvedValueOnce(
      JSON.stringify({ section: 'g', tags: 'bad', confidence: 0.9 })
    );
    await expect(classifyFile('x')).rejects.toThrow('Invalid tags');
  });

  it('moveFile cleans up on write failure', async () => {
    fs.writeFile.mockRejectedValueOnce(new Error('wfail'));
    await expect(moveFile('src.txt', 'dest')).rejects.toThrow('wfail');
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('moveFile cleans up on unlink source failure', async () => {
    fs.unlink.mockImplementationOnce((p) => {
      if (p === 'src.txt') throw new Error('ufail');
      return Promise.resolve();
    });
    await expect(moveFile('src.txt', 'dest')).rejects.toThrow('ufail');
    expect(fs.unlink).toHaveBeenCalled();
  });

  it('getDynamicSections returns empty list on error', async () => {
    fs.readdir.mockRejectedValueOnce(new Error('err'));
    const secs = await getDynamicSections();
    expect(secs).toEqual([]);
  });
});
