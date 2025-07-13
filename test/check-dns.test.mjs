import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('dns/promises', () => ({
  resolve4: vi.fn(),
  resolve6: vi.fn(),
  resolveCname: vi.fn(),
}));

import {
  main,
  isGitHubA,
  isGitHubAAAA,
  isGitHubCNAME,
} from '../scripts/check-dns.mjs';
import { resolve4, resolve6, resolveCname } from 'dns/promises';

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('check-dns', () => {
  it('isGitHubA detects GitHub IPs', () => {
    expect(isGitHubA(['185.199.108.153'])).toBe(true);
    expect(isGitHubA(['1.1.1.1'])).toBe(false);
  });

  it('isGitHubAAAA detects GitHub IPv6', () => {
    expect(isGitHubAAAA(['2606:50c0:8000::153'])).toBe(true);
    expect(isGitHubAAAA(['::1'])).toBe(false);
  });

  it('isGitHubCNAME detects github.io', () => {
    expect(isGitHubCNAME(['user.github.io'])).toBe(true);
    expect(isGitHubCNAME(['example.com'])).toBe(false);
  });

  it('main logs pass when records match', async () => {
    fs.readFile.mockResolvedValue('example.com');
    resolve4.mockResolvedValue(['185.199.108.153']);
    resolve6.mockResolvedValue([]);
    resolveCname.mockResolvedValue([]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();
    expect(logSpy).toHaveBeenCalledWith('[INFO]', 'DNS PASS for example.com');
  });

  it('main logs pass when AAAA records match', async () => {
    fs.readFile.mockResolvedValue('example.com');
    resolve4.mockResolvedValue([]);
    resolve6.mockResolvedValue(['2606:50c0:8000::153']);
    resolveCname.mockResolvedValue([]);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await main();
    expect(logSpy).toHaveBeenCalledWith('[INFO]', 'DNS PASS for example.com');
  });

  it('main logs fail when records do not match', async () => {
    fs.readFile.mockResolvedValue('example.com');
    resolve4.mockResolvedValue(['1.1.1.1']);
    resolve6.mockResolvedValue(['::1']);
    resolveCname.mockResolvedValue(['example.org']);
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await main();
    expect(errSpy).toHaveBeenCalledWith('[ERROR]', 'DNS FAIL for example.com');
  });

  it('main logs error when CNAME file missing', async () => {
    fs.readFile.mockRejectedValue(
      Object.assign(new Error('no file'), { code: 'ENOENT' })
    );
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    await main();
    expect(errSpy).toHaveBeenCalledWith(
      '[ERROR]',
      'CNAME file missing at CNAME; DNS check skipped'
    );
  });
});
