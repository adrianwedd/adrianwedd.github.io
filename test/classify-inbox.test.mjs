import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

// Mock fs before any imports
vi.mock('fs/promises');

// Import the module to be tested
import * as classifyInbox from '../scripts/classify-inbox.mjs';

describe('classify-inbox.mjs', () => {
  const mockFiles = ['file1.txt', 'file2.txt', '.gitkeep'];

  beforeEach(() => {
    // Set env var for most tests
    process.env.OPENAI_API_KEY = 'test-key';

    // Mock implementations
    vi.spyOn(fs, 'readdir').mockResolvedValue(mockFiles);
    vi.spyOn(fs, 'readFile').mockResolvedValue('Test content');
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    vi.spyOn(fs, 'rename').mockResolvedValue(undefined);
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  const mockOpenAIResponse = (response, status = 200) => {
    global.fetch.mockResolvedValue({
      ok: status === 200,
      status,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(response) } }] }),
      text: async () => 'Error text',
    });
  };

  it('should move a file to the correct section on successful classification', async () => {
    mockOpenAIResponse({ section: 'garden', tags: ['a', 'b'], confidence: 0.9 });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/garden/file1.txt'));
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should move a file to untagged for low confidence', async () => {
    mockOpenAIResponse({ section: 'garden', tags: [], confidence: 0.7 });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/untagged/file1.txt'));
  });

  it('should move a file to untagged for unknown section', async () => {
    mockOpenAIResponse({ section: 'unknown', tags: [], confidence: 0.9 });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/untagged/file1.txt'));
  });

  it('should move a file to failed on invalid JSON response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'invalid-json' } }] }),
    });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/inbox/failed/file1.txt'));
  });

  it('should move a file to failed on malformed (missing keys) response', async () => {
    mockOpenAIResponse({ section: 'garden' });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/inbox/failed/file1.txt'));
  });

  it('should move a file to failed on OpenAI API error', async () => {
    mockOpenAIResponse({}, 500);
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(expect.stringContaining('file1.txt'), expect.stringContaining('content/inbox/failed/file1.txt'));
  });

  it('should skip classification if API key is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await classifyInbox.main();
    expect(fs.readdir).not.toHaveBeenCalled();
  });
});
