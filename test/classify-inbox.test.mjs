import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

// Mock fs before importing the module under test
vi.mock('fs/promises');
// Mock the LLM API utility
vi.mock('../scripts/utils/llm-api.mjs', () => ({
  callOpenAI: vi.fn(),
}));
// Mock file-utils for readFile
vi.mock('../scripts/utils/file-utils.mjs', () => ({ readFile: vi.fn() }));

// Import the module to be tested
import * as classifyInbox from '../scripts/classify-inbox.mjs';
import { callOpenAI } from '../scripts/utils/llm-api.mjs';
import { readFile } from '../scripts/utils/file-utils.mjs';

describe('classify-inbox.mjs', () => {
  // Helper to create Dirent-like objects for mocking fs.readdir
  const createDirent = (name, isDirectory = false) => ({
    name,
    isDirectory: () => isDirectory,
  });

  const mockFiles = [
    createDirent('file1.txt'),
    createDirent('file2.txt'),
    createDirent('.gitkeep'),
    createDirent('garden', true), // Add a directory for dynamic sections
    createDirent('logs', true),
    createDirent('mirror', true),
    createDirent('inbox', true),
    createDirent('untagged', true),
    createDirent('agents', true),
    createDirent('codex', true),
    createDirent('tools', true),
    createDirent('resume', true),
  ];

  beforeEach(() => {
    // Set env var for most tests
    process.env.OPENAI_API_KEY = 'test-key';
    process.argv = ['node', 'script'];
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock implementations
    fs.readdir.mockImplementation((dirPath, options) => {
      if (options && options.withFileTypes) {
        // Return Dirent-like objects for 'content' directory
        if (dirPath === 'content') {
          return Promise.resolve(mockFiles);
        }
        // For inboxDir, return only files, not directories
        if (dirPath.endsWith('content/inbox')) {
          return Promise.resolve(
            mockFiles.filter((d) => !d.isDirectory()).map((d) => d.name)
          );
        }
      }
      // Default behavior for other readdir calls (e.g., in main for inboxDir without withFileTypes)
      return Promise.resolve(
        mockFiles.filter((d) => !d.isDirectory()).map((d) => d.name)
      );
    });
    readFile.mockResolvedValue('Test content');
    fs.mkdir.mockResolvedValue(undefined);
    fs.rename.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
    fs.unlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  const mockOpenAIResponse = (response) => {
    callOpenAI.mockResolvedValue(JSON.stringify(response));
  };

  it('should move a file to the correct section on successful classification', async () => {
    mockOpenAIResponse({
      section: 'garden',
      tags: ['a', 'b'],
      confidence: 0.9,
      reasoning: 'clear topic',
    });
    await classifyInbox.main();

    const sentPrompt = callOpenAI.mock.calls[0][0];
    const expectedPrompt = await classifyInbox.buildPrompt('Test content');
    expect(sentPrompt).toBe(expectedPrompt);

    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/garden/file1.txt'),
      expect.stringContaining('---')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt.lock')
    );
    expect(fs.rename).not.toHaveBeenCalled();
  });

  it('should move a file to review-needed for low confidence', async () => {
    mockOpenAIResponse({
      section: 'garden',
      tags: [],
      confidence: 0.7,
      reasoning: 'uncertain',
    });
    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/review-needed/file1.txt'),
      expect.stringContaining('reasoning:')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('should move a file to untagged for unknown section', async () => {
    mockOpenAIResponse({
      section: 'unknown',
      tags: [],
      confidence: 0.9,
      reasoning: 'no match',
    });
    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/untagged/file1.txt'),
      expect.stringContaining('status: draft')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('should move a file to failed on invalid JSON response', async () => {
    callOpenAI.mockResolvedValue('invalid-json');
    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/failed/file1.txt'),
      'Test content'
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('should move a file to failed on malformed (missing keys) response', async () => {
    mockOpenAIResponse({ section: 'garden' });
    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/failed/file1.txt'),
      'Test content'
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('should move a file to failed on OpenAI API error', async () => {
    callOpenAI.mockRejectedValue(new Error('API error'));
    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/failed/file1.txt'),
      'Test content'
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('should skip classification if API key is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await classifyInbox.main();
    expect(fs.readdir).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('OPENAI_API_KEY not set')
    );
  });

  it('logs processing steps', async () => {
    const logSpy = vi.spyOn(console, 'log');
    mockOpenAIResponse({
      section: 'garden',
      tags: [],
      confidence: 0.9,
      reasoning: 'ok',
    });
    await classifyInbox.main();
    expect(logSpy).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('Processing file1.txt')
    );
  });

  it('skips a file when a lock exists', async () => {
    fs.writeFile.mockImplementationOnce((filePath) => {
      if (filePath.endsWith('.lock')) {
        const err = new Error('exists');
        err.code = 'EEXIST';
        return Promise.reject(err);
      }
      return Promise.resolve();
    });

    await classifyInbox.main();

    expect(callOpenAI).toHaveBeenCalledTimes(1);
    expect(fs.unlink).not.toHaveBeenCalledWith(
      expect.stringContaining('content/inbox/file1.txt')
    );
  });

  it('logs message when inbox empty', async () => {
    fs.readdir.mockImplementation((dirPath, options) => {
      if (options && options.withFileTypes && dirPath === 'content') {
        return Promise.resolve(mockFiles);
      }
      if (dirPath.includes('content/inbox')) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    await classifyInbox.main();
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      'No inbox files to process.'
    );
  });

  it('logs message when changed args have no files', async () => {
    process.argv = ['node', 'script', 'content/inbox/nothing.txt'];
    await classifyInbox.main();
    expect(console.log).toHaveBeenCalledWith(
      '[INFO]',
      'No relevant changed inbox files to process.'
    );
  });

  it('handles inbox read error', async () => {
    fs.readdir.mockImplementation((dirPath, options) => {
      if (options && options.withFileTypes && dirPath === 'content') {
        return Promise.resolve(mockFiles);
      }
      throw new Error('oops');
    });
    await classifyInbox.main();
    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('Error reading inbox directory'),
      'oops'
    );
  });

  it('processes files with unusual names', async () => {
    const weird = 'weird name @#$%.md';
    fs.readdir.mockImplementation((dirPath, options) => {
      if (options && options.withFileTypes && dirPath === 'content') {
        return Promise.resolve(mockFiles);
      }
      if (dirPath.includes('content/inbox')) return Promise.resolve([weird]);
      return Promise.resolve([]);
    });

    mockOpenAIResponse({
      section: 'garden',
      tags: ['odd'],
      confidence: 0.95,
      reasoning: 'looks garden',
    });

    await classifyInbox.main();
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(`content/garden/${weird}`),
      expect.stringContaining('---')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      expect.stringContaining(`content/inbox/${weird}`)
    );
  });
});
