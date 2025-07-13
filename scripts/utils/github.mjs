import { retryFetch } from './retryFetch.mjs';

/**
 * Build the authorization headers for GitHub API requests.
 * @returns {{Accept: string, Authorization: string}} Header object for fetch.
 * @throws {Error} If `GH_TOKEN` is not defined.
 */
export function getGitHubHeaders() {
  const GH_TOKEN = process.env.GH_TOKEN;
  if (!GH_TOKEN) {
    throw new Error(
      'GH_TOKEN environment variable is required for GitHub API calls.'
    );
  }
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${GH_TOKEN}`,
  };
}

/**
 * Fetch from the GitHub API with retries and a JSON response.
 * @param {string} url Request URL.
 * @param {RequestInit} [options={}] Additional fetch options.
 * @returns {Promise<any>} Parsed JSON from the response.
 */
export async function githubFetch(url, options = {}) {
  const headers = getGitHubHeaders();
  const res = await retryFetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  return res.json();
}
