/* eslint-disable no-unused-vars */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

// Mock fs before any imports
vi.mock('fs/promises');

// Mock the callOpenAI function from classify-inbox.mjs
vi.mock('../scripts/classify-inbox.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    callOpenAI: vi.fn(),
  };
});

// Import the module to be tested
import * as buildInsights from '../scripts/build-insights.mjs';
import { callOpenAI } from '../scripts/classify-inbox.mjs'; // Import the mocked function

describe('build-insights.mjs', () => {
  const mockMarkdownContent = '# Test Content\nThis is some test content.';
  const mockSummary = 'Concise summary of test content.';

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(fs, 'readdir').mockResolvedValue([
      'file1.md',
      'file2.md',
      'file3.insight.md',
    ]);
    vi.spyOn(fs, 'readFile').mockResolvedValue(mockMarkdownContent);
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);
    callOpenAI.mockResolvedValue(mockSummary);
    process.env.OPENAI_API_KEY = 'test-key';
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
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
    expect(fs.writeFile).toHaveBeenCalledWith(
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
      expect.stringContaining('Failed to generate insight'),
      'LLM API error'
    );
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('main should process markdown files in target directories', async () => {
    await buildInsights.main();
    expect(fs.readdir).toHaveBeenCalledWith(path.join('content', 'garden'));
    expect(fs.readdir).toHaveBeenCalledWith(path.join('content', 'logs'));
    expect(fs.readdir).toHaveBeenCalledWith(path.join('content', 'mirror'));
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'file1.insight.md'),
      mockSummary
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
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
    vi.spyOn(fs, 'readdir').mockImplementation((dirPath) => {
      if (dirPath.includes('garden')) return Promise.reject({ code: 'ENOENT' });
      return Promise.resolve([]);
    });
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});
    await buildInsights.main();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Directory not found: content/garden')
    );
  });

  it('main should skip insight generation if API key is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    await buildInsights.main();
    expect(fs.readdir).not.toHaveBeenCalled();
  });
});
