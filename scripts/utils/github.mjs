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

export async function githubFetch(url, options = {}) {
  const headers = getGitHubHeaders();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `GitHub API error for ${url}: ${res.status} ${res.statusText}\n${errorBody}`
    );
  }

  return res.json();
}
