import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import { callOpenAI } from '../scripts/utils/llm-api.mjs';
import { hashText, _clearCache } from '../scripts/utils/llm-cache.mjs';

const cacheFile = 'cache-test.json';

describe('llm cache integration', () => {
  beforeEach(async () => {
    process.env.LLM_CACHE_FILE = cacheFile;
    await fs.writeFile(cacheFile, '{}');
    _clearCache();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
    });
    process.env.OPENAI_API_KEY = 'k';
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    delete process.env.LLM_CACHE_FILE;
    delete process.env.OPENAI_API_KEY;
    try { await fs.unlink(cacheFile); } catch {}
  });

  it('reuses cached result for same key', async () => {
    const prompt = 'hello';
    const key = hashText(prompt);
    const first = await callOpenAI(prompt, key);
    expect(first).toBe('hi');

    const second = await callOpenAI(prompt, key);
    expect(second).toBe('hi');
  });
});
