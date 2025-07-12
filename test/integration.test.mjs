/* eslint-disable no-unused-vars */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import fsSync from 'fs';
import { Readable } from 'stream';
import path from 'path';

// Mock fs before any imports
vi.mock('fs/promises');
vi.mock('fs');

// Mock external API calls
vi.mock('../scripts/utils/github.mjs', () => ({
  githubFetch: vi.fn(),
}));
vi.mock('../scripts/classify-inbox.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    callOpenAI: vi.fn(),
  };
});

// Placeholders for dynamically imported modules
let fetchGhReposMain;
let classifyInboxMain;
let buildInsightsMain;
let agentBusMain;
let githubFetch;
let callOpenAI;
let fileContents;

const createMockFiles = () => ({
  'content/inbox/test-doc-garden.md': 'This is a garden note about plants.',
  'content/inbox/test-doc-log.md': "Log entry for today's activities.",
  'content/inbox/test-doc-untagged.txt': 'This file should not be classified.',
  'content/agents/test-agent.yml':
    'id: test-agent\nname: Test Agent\nowner: @testuser\nrole: Testing automation\nstatus: active\nlast_updated: 2025-01-01T00:00:00Z\ndescription: An agent for testing purposes.',
});

describe('Integration Test: Full Automation Pipeline', () => {
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const utils = await import('../scripts/utils/github.mjs');
    githubFetch = vi.fn();
    vi.spyOn(utils, 'githubFetch').mockImplementation((...args) =>
      githubFetch(...args)
    );

    ({ main: fetchGhReposMain } = await import(
      '../scripts/fetch-gh-repos.mjs'
    ));
    ({ main: classifyInboxMain, callOpenAI } = await import(
      '../scripts/classify-inbox.mjs'
    ));
    ({ main: buildInsightsMain } = await import(
      '../scripts/build-insights.mjs'
    ));
    ({ main: agentBusMain } = await import('../scripts/agent-bus.mjs'));

    // Mock fs operations for the entire pipeline
    vi.spyOn(fs, 'readdir').mockImplementation((dirPath, options) => {
      if (dirPath === 'content/inbox') {
        return Promise.resolve([
          'test-doc-garden.md',
          'test-doc-log.md',
          'test-doc-untagged.txt',
        ]);
      }
      if (dirPath === 'content/agents') {
        return Promise.resolve(['test-agent.yml']);
      }
      if (
        dirPath === 'content/garden' ||
        dirPath === 'content/logs' ||
        dirPath === 'content/mirror'
      ) {
        // Simulate empty directories initially, files will be moved/created
        return Promise.resolve([]);
      }
      if (options && options.withFileTypes) {
        // For getDynamicSections in classify-inbox.mjs
        return Promise.resolve([
          { name: 'garden', isDirectory: () => true },
          { name: 'logs', isDirectory: () => true },
          { name: 'mirror', isDirectory: () => true },
          { name: 'inbox', isDirectory: () => true },
          { name: 'untagged', isDirectory: () => true },
          { name: 'agents', isDirectory: () => true },
          { name: 'codex', isDirectory: () => true },
          { name: 'tools', isDirectory: () => true },
          { name: 'resume', isDirectory: () => true },
        ]);
      }
      return Promise.resolve([]);
    });

    fileContents = createMockFiles();

    vi.spyOn(fsSync, 'createReadStream').mockImplementation((filePath) => {
      return Readable.from([fileContents[filePath] || '']);
    });

    vi.spyOn(fs, 'readFile').mockImplementation((filePath) => {
      return Promise.resolve(fileContents[filePath] || '');
    });

    vi.spyOn(fs, 'rename').mockImplementation((src, dest) => {
      const content = fileContents[src];
      fileContents[dest] = content;
      delete fileContents[src];
      return Promise.resolve();
    });

    vi.spyOn(fs, 'unlink').mockImplementation((filePath) => {
      delete fileContents[filePath];
      return Promise.resolve();
    });

    vi.spyOn(fs, 'writeFile').mockImplementation((filePath, content) => {
      fileContents[filePath] = content;
      return Promise.resolve();
    });

    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined);

    // Mock GitHub API responses
    githubFetch.mockImplementation((url) => {
      if (url.includes('/user')) {
        return Promise.resolve({ login: 'testuser' });
      }
      if (url.includes('/repos')) {
        return Promise.resolve([
          {
            name: 'test-repo-tool',
            html_url: 'http://github.com/testuser/test-repo-tool',
            description: 'A test tool',
            updated_at: '2025-01-01T10:00:00Z',
            topics: ['tool'],
          },
          {
            name: 'another-repo',
            html_url: 'http://github.com/testuser/another-repo',
            description: 'Not a tool',
            updated_at: '2025-01-01T11:00:00Z',
            topics: [],
          },
        ]);
      }
      if (url.includes('/issues')) {
        // Simulate no existing agent-bus issue initially
        return Promise.resolve([]);
      }
      return Promise.resolve({});
    });

    // Mock OpenAI API responses
    callOpenAI.mockImplementation((prompt) => {
      if (prompt.includes('garden note')) {
        return Promise.resolve(
          JSON.stringify({
            section: 'garden',
            tags: ['plants', 'nature'],
            confidence: 0.95,
          })
        );
      }
      if (prompt.includes('Log entry')) {
        return Promise.resolve(
          JSON.stringify({
            section: 'logs',
            tags: ['daily', 'activity'],
            confidence: 0.9,
          })
        );
      }
      // For unclassified files
      return Promise.resolve(
        JSON.stringify({ section: 'untagged', tags: [], confidence: 0.4 })
      );
    });

    process.env.GH_TOKEN = 'mock_gh_token';
    process.env.OPENAI_API_KEY = 'mock_openai_key';
    process.env.GH_REPO = 'testuser/testrepo';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    delete process.env.GH_TOKEN;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GH_REPO;
    fileContents = {};
  });

  it('should run the full automation pipeline successfully', async () => {
    // 1. Run fetch-gh-repos
    await fetchGhReposMain();
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'tools', 'test-repo-tool.md'),
      expect.stringContaining('title: test-repo-tool')
    );

    // 2. Run classify-inbox
    await classifyInboxMain();
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'test-doc-garden.md'),
      expect.stringContaining('---')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'logs', 'test-doc-log.md'),
      expect.any(String)
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'untagged', 'test-doc-untagged.txt'),
      expect.any(String)
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      path.join('content', 'inbox', 'test-doc-garden.md')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      path.join('content', 'inbox', 'test-doc-log.md')
    );
    expect(fs.unlink).toHaveBeenCalledWith(
      path.join('content', 'inbox', 'test-doc-untagged.txt')
    );

    // 3. Run build-insights
    await buildInsightsMain();
    expect(callOpenAI).toHaveBeenCalledWith(
      expect.stringContaining('Summarize')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'test-doc-garden.insight.md'),
      expect.stringContaining('Concise summary')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'logs', 'test-doc-log.insight.md'),
      expect.stringContaining('Concise summary')
    );

    // 4. Run agent-bus
    await agentBusMain();
    expect(githubFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(githubFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues'),
      expect.objectContaining({
        body: expect.stringContaining('| id | status |'),
      })
    );
  });

  it('logs error and continues when GH_TOKEN is missing', async () => {
    delete process.env.GH_TOKEN;

    await fetchGhReposMain();

    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('GH_TOKEN not set')
    );

    await classifyInboxMain();
    await buildInsightsMain();
    await agentBusMain();

    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'garden', 'test-doc-garden.md'),
      expect.stringContaining('---')
    );
  });

  it('logs OpenAI errors and moves files to failed', async () => {
    callOpenAI.mockImplementationOnce(() =>
      Promise.reject(new Error('OpenAI fail'))
    );

    await classifyInboxMain();

    expect(console.error).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('Failed to classify')
    );
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join('content', 'inbox', 'failed', 'test-doc-garden.md'),
      expect.any(String)
    );

    await buildInsightsMain();
    await agentBusMain();
  });
});
