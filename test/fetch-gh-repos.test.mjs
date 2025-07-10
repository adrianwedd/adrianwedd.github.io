import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import fs from 'fs/promises';
let fetchRepos, repoToMarkdown, getLogin, main;
async function loadModule() {
  ({ fetchRepos, repoToMarkdown, getLogin, main } = await import(
    '../scripts/fetch-gh-repos.mjs'
  ));
}

function mockFetch(responses) {
  global.fetch = vi.fn();
  responses.forEach((resp) => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => resp,
    });
  });
}

describe('fetch-gh-repos', () => {
  beforeEach(async () => {
    process.env.GH_TOKEN = 'test';
    await loadModule();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GH_USER;
    delete process.env.GH_TOKEN;
  });

  it('fetchRepos paginates through all pages', async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i }));
    const page2 = [{ id: 100 }];
    mockFetch([page1, page2]);
    const repos = await fetchRepos('someone');
    expect(repos).toHaveLength(101);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('repoToMarkdown formats frontmatter', () => {
    const repo = {
      name: 'tool',
      html_url: 'url',
      description: 'desc',
      updated_at: 'date',
    };
    const md = repoToMarkdown(repo);
    expect(md).toContain('title: tool');
    expect(md).toContain('repo: url');
    expect(md).toContain('description: desc');
  });

  it('getLogin uses GH_USER if set', async () => {
    process.env.GH_USER = 'abc';
    const login = await getLogin();
    expect(login).toBe('abc');
  });

  it('getLogin fetches user when GH_USER not set', async () => {
    mockFetch([{ login: 'def' }]);
    const login = await getLogin();
    expect(login).toBe('def');
  });

  it('main writes markdown for repos tagged as tool', async () => {
    mockFetch([
      { login: 'user' },
      [
        {
          name: 'tool1',
          html_url: 'url1',
          description: 'd1',
          updated_at: 'date1',
          topics: ['tool'],
        },
        {
          name: 'not',
          html_url: 'url2',
          description: 'd2',
          updated_at: 'date2',
          topics: [],
        },
      ],
    ]);
    const mkdir = vi.spyOn(fs, 'mkdir').mockResolvedValue();
    const write = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    await main();
    expect(mkdir).toHaveBeenCalled();
    expect(write).toHaveBeenCalledTimes(1);
    mkdir.mockRestore();
    write.mockRestore();
  });

  it('main skips when GH_TOKEN not set', async () => {
    delete process.env.GH_TOKEN;
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    await main();
    expect(error).toHaveBeenCalledWith(
      '[ERROR]',
      'GH_TOKEN not set; skipping fetch-gh-repos'
    );
    error.mockRestore();
  });
  it('main throws when mkdir fails', async () => {
    mockFetch([{ login: 'user' }, []]);
    const mkdir = vi.spyOn(fs, 'mkdir').mockRejectedValue(new Error('mkerr'));
    await expect(main()).rejects.toThrow('mkerr');
    mkdir.mockRestore();
  });

  it('main logs error when writeFile fails', async () => {
    mockFetch([
      { login: 'user' },
      [
        {
          name: 'tool1',
          html_url: 'u',
          description: 'd',
          updated_at: 't',
          topics: ['tool'],
        },
      ],
    ]);
    vi.spyOn(fs, 'mkdir').mockResolvedValue();
    const write = vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('wr'));
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await main();
    expect(err).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('Error writing file'),
      'wr'
    );
    write.mockRestore();
  });
});
