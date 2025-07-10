/* eslint-disable no-unused-vars */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock fs before any imports
vi.mock('fs/promises');

// Mock the LLM API utility
vi.mock('../scripts/utils/llm-api.mjs', () => ({
  callOpenAI: vi.fn(),
}));

// Import the module to be tested
import { log } from '../scripts/utils/logger.mjs';

// Mock file-utils before any imports
vi.mock('../scripts/utils/file-utils.mjs', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  readdir: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
}));

// Import the module to be tested
import * as buildInsights from '../scripts/build-insights.mjs';
import { callOpenAI } from '../scripts/utils/llm-api.mjs';
import { readFile, writeFile, readdir } from '../scripts/utils/file-utils.mjs'; // Import mocked file-utils functions

const originalArgv = process.argv.slice();

describe('build-insights.mjs', () => {
  const mockMarkdownContent = '# Test Content\nThis is some test content.';
  const mockSummary = 'Concise summary of test content.';

  beforeEach(() => {
    vi.restoreAllMocks();
    readFile.mockResolvedValue(mockMarkdownContent);
    writeFile.mockResolvedValue(undefined);
    readdir.mockImplementation((dir) => {
      if (dir === path.join('content', 'garden')) {
        return Promise.resolve(['file1.md', 'file2.md', 'file3.insight.md']);
      }
      if (dir === path.join('content', 'logs')) {
        return Promise.resolve(['log1.md', 'log2.md']);
      }
      if (dir === path.join('content', 'mirror')) {
        return Promise.resolve(['mirror1.md', 'mirror2.md']);
      }
      return Promise.resolve([]);
    });
    callOpenAI.mockResolvedValue(mockSummary);
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    process.argv = originalArgv.slice();
  });

  it('buildSummaryPrompt should generate a correct prompt', () => {
    const prompt = buildInsights.buildSummaryPrompt(mockMarkdownContent);
    expect(prompt).toContain('Summarize the following text concisely');
    expect(prompt).toContain(mockMarkdownContent);
  });

  it('processMarkdownFile should generate an insight file', async () => {
    const filePath = path.join('content', 'garden', 'file1.md');
    await buildInsights.processMarkdownFile(filePath);
    expect(callOpenAI).toHaveBeenCalledWith(
      buildInsights.buildSummaryPrompt(mockMarkdownContent)
    );
    expect(writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'file1.insight.md'),
      mockSummary
    );
  });

  it('processMarkdownFile should handle LLM API errors gracefully', async () => {
    callOpenAI.mockRejectedValue(new Error('LLM API error'));
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const filePath = path.join('content', 'garden', 'file1.md');
    await buildInsights.processMarkdownFile(filePath);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('Failed to generate insight'),
      'LLM API error'
    );
    expect(writeFile).not.toHaveBeenCalled();
  });

  it('main should process markdown files in target directories', async () => {
    await buildInsights.main();
    expect(readdir).toHaveBeenCalledWith(path.join('content', 'garden'));
    expect(readdir).toHaveBeenCalledWith(path.join('content', 'logs'));
    expect(readdir).toHaveBeenCalledWith(path.join('content', 'mirror'));
    expect(writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'file1.insight.md'),
      mockSummary
    );
    expect(writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'file2.insight.md'),
      mockSummary
    );
  });

  it('main should skip insight files', async () => {
    const processMarkdownFileSpy = vi.spyOn(
      buildInsights,
      'processMarkdownFile'
    );
    await buildInsights.main();
    expect(processMarkdownFileSpy).not.toHaveBeenCalledWith(
      path.join('content', 'garden', 'file3.insight.md')
    );
  });

  it('main should handle missing directories gracefully', async () => {
    readdir.mockImplementation((dirPath) => {
      if (dirPath.includes('garden')) return Promise.reject({ code: 'ENOENT' });
      return Promise.resolve([]);
    });
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    await buildInsights.main();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[WARN]',
      expect.stringContaining('Directory not found: content/garden')
    );
  });

  it('main should skip insight generation if API key is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await buildInsights.main();
    expect(readdir).not.toHaveBeenCalled();
  });

  it('main should handle relative changed file arguments', async () => {
    const changedArg = path.join('content', 'garden', 'file1.md');
    process.argv = ['node', 'build-insights.mjs', changedArg];
    await buildInsights.main();
    expect(writeFile).toHaveBeenCalledWith(
      path.resolve('content', 'garden', 'file1.insight.md'),
      mockSummary
    );
    expect(readdir).not.toHaveBeenCalled();
  });
});
