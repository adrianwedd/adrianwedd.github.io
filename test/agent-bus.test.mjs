import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');
vi.mock('../../scripts/utils/github.mjs', () => ({
  githubFetch: vi.fn(),
}));
vi.mock('yaml', () => ({
  parse: vi.fn(),
}));

import * as agentBus from '../../scripts/agent-bus.mjs';

describe('agent-bus.mjs', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(fs, 'readdir').mockResolvedValue([]);
    vi.spyOn(fs, 'readFile').mockResolvedValue('');
    process.env.GH_REPO = 'test/repo';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.GH_REPO;
    delete process.env.GITHUB_REPOSITORY;
  });

  it('should load manifests (minimal test)', async () => {
    const manifests = await agentBus.loadManifests();
    expect(manifests).toEqual([]);
  });
});
