import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

// Mock fs before importing the module under test
vi.mock('fs/promises');
// Mock the LLM API utility
vi.mock('../scripts/utils/llm-api.mjs', () => ({
  callOpenAI: vi.fn(),
}));

// Import the module to be tested
import * as classifyInbox from '../scripts/classify-inbox.mjs';
import { callOpenAI } from '../scripts/utils/llm-api.mjs';

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
    fs.readFile.mockResolvedValue('Test content');
    fs.mkdir.mockResolvedValue(undefined);
    fs.rename.mockResolvedValue(undefined);
    fs.writeFile.mockResolvedValue(undefined);
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
    });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/garden/file1.txt')
    );
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('should move a file to untagged for low confidence', async () => {
    mockOpenAIResponse({ section: 'garden', tags: [], confidence: 0.7 });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/untagged/file1.txt')
    );
  });

  it('should move a file to untagged for unknown section', async () => {
    mockOpenAIResponse({ section: 'unknown', tags: [], confidence: 0.9 });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/untagged/file1.txt')
    );
  });

  it('should move a file to failed on invalid JSON response', async () => {
    callOpenAI.mockResolvedValue('invalid-json');
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/inbox/failed/file1.txt')
    );
  });

  it('should move a file to failed on malformed (missing keys) response', async () => {
    mockOpenAIResponse({ section: 'garden' });
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/inbox/failed/file1.txt')
    );
  });

  it('should move a file to failed on OpenAI API error', async () => {
    callOpenAI.mockRejectedValue(new Error('API error'));
    await classifyInbox.main();
    expect(fs.rename).toHaveBeenCalledWith(
      expect.stringContaining('file1.txt'),
      expect.stringContaining('content/inbox/failed/file1.txt')
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
    mockOpenAIResponse({ section: 'garden', tags: [], confidence: 0.9 });
    await classifyInbox.main();
    expect(logSpy).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('Processing file1.txt')
    );
  });
});
