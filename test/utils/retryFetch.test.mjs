import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryFetch } from '../../scripts/utils/retryFetch.mjs';
import { log } from '../../scripts/utils/logger.mjs';

beforeEach(() => {
  global.fetch = vi.fn();
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('retryFetch', () => {
  it('returns response on first success without retries', async () => {
    const response = { ok: true, status: 200 };
    global.fetch.mockResolvedValueOnce(response);
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});

    const result = await retryFetch('http://example.com');

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(warn).not.toHaveBeenCalled();
  });

  it('retries on failure until success', async () => {
    const response = { ok: true, status: 200 };
    global.fetch
      .mockRejectedValueOnce(new Error('fail1'))
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Error',
        text: async () => 'err',
      })
      .mockResolvedValueOnce(response);

    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});

    const result = await retryFetch(
      'http://example.com',
      {},
      { retries: 2, backoff: 0 }
    );

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('throws error after max retries', async () => {
    global.fetch.mockRejectedValue(new Error('netfail'));
    const warn = vi.spyOn(log, 'warn').mockImplementation(() => {});

    await expect(
      retryFetch('http://example.com', {}, { retries: 1, backoff: 0 })
    ).rejects.toThrow('netfail');

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
