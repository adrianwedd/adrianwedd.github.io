import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getGitHubHeaders, githubFetch } from '../../scripts/utils/github.mjs';

describe('github.mjs', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GH_TOKEN;
  });

  describe('getGitHubHeaders', () => {
    it('should return headers when GH_TOKEN is set', () => {
      process.env.GH_TOKEN = 'test_token';
      const headers = getGitHubHeaders();
      expect(headers).toEqual({
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer test_token',
      });
    });

    it('should throw an error when GH_TOKEN is not set', () => {
      delete process.env.GH_TOKEN;
      expect(() => getGitHubHeaders()).toThrow('GH_TOKEN environment variable is required for GitHub API calls.');
    });
  });

  describe('githubFetch', () => {
    it('should fetch data successfully', async () => {
      process.env.GH_TOKEN = 'test_token';
      const mockData = { message: 'success' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      const data = await githubFetch('https://api.github.com/test');
      expect(data).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
          }),
        })
      );
    });

    it('should throw an error on non-ok response', async () => {
      process.env.GH_TOKEN = 'test_token';
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Error: Not Found',
      });

      await expect(githubFetch('https://api.github.com/test')).rejects.toThrow(
        'GitHub API error for https://api.github.com/test: 404 Not Found\nError: Not Found'
      );
    });

    it('should merge custom headers', async () => {
      process.env.GH_TOKEN = 'test_token';
      const mockData = { message: 'success' };
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockData,
      });

      await githubFetch('https://api.github.com/test', {
        headers: { 'X-Custom-Header': 'value' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.github.com/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test_token',
            'X-Custom-Header': 'value',
          }),
        })
      );
    });
  });
});