import { retryFetch } from './retryFetch.mjs';

// Build the authorization headers for GitHub API requests
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

// Fetch from the GitHub API with retries and JSON response
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
