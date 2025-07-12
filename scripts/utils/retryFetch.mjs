import { log } from './logger.mjs';

// Fetch with exponential backoff retry behaviour
export async function retryFetch(
  url,
  options = {},
  { retries = 3, backoff = 500 } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Fetch failed ${response.status} ${response.statusText} - ${errorBody}`
        );
      }
      return response;
    } catch (err) {
      if (attempt === retries) throw err;
      const delay = backoff * 2 ** attempt;
      log.warn(
        `Retry ${attempt + 1}/${retries} for ${url} after error: ${err.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
