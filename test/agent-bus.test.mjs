import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../scripts/utils/github.mjs', () => ({ githubFetch: vi.fn() }));
import { githubFetch } from '../scripts/utils/github.mjs';

const loadAgentBus = async () =>
  import('../scripts/agent-bus.mjs?' + Date.now());

beforeEach(() => {
  vi.restoreAllMocks();
  fs.readdir.mockResolvedValue(['agent.yml']);
  fs.readFile.mockResolvedValue(
    'id: test\nstatus: active\nlast_updated: 2025-01-01\nowner: me\nrole: tester'
  );
  githubFetch.mockReset();
  delete process.env.GH_REPO;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GH_TOKEN;
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GH_REPO;
  delete process.env.GH_TOKEN;
});

describe('agent-bus.mjs', () => {
  it('loadManifests reads yaml files', async () => {
    const agentBus = await loadAgentBus();
    const data = await agentBus.loadManifests('content/agents');
    expect(data[0].id).toBe('test');
  });

  it('loadManifests returns empty array on readdir error', async () => {
    fs.readdir.mockRejectedValueOnce(new Error('bad'));
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const agentBus = await loadAgentBus();
    const res = await agentBus.loadManifests('bad');
    expect(res).toEqual([]);
    expect(logSpy).toHaveBeenCalled();
  });

  it('loadManifests skips malformed YAML files', async () => {
    fs.readdir.mockResolvedValueOnce(['good.yml', 'bad.yml']);
    fs.readFile.mockImplementation((file) => {
      if (file.endsWith('good.yml'))
        return Promise.resolve(
          'id: good\nstatus: active\nlast_updated: 2025-01-01\nowner: me\nrole: r'
        );
      if (file.endsWith('bad.yml')) return Promise.resolve(': : : :');
      return Promise.resolve('');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const agentBus = await loadAgentBus();
    const res = await agentBus.loadManifests('agents');
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('good');
    expect(errSpy).toHaveBeenCalled();
  });

  it('manifestsToMarkdown formats table', async () => {
    const agentBus = await loadAgentBus();
    const md = agentBus.manifestsToMarkdown([
      { id: 'x', status: 's', last_updated: 'd', owner: 'o', role: 'r' },
    ]);
    expect(md).toContain('| x | s | d | o | r |');
  });

  it('manifestsToMarkdown handles empty list', async () => {
    const agentBus = await loadAgentBus();
    expect(agentBus.manifestsToMarkdown([])).toBe('No agents found.');
  });

  it('getIssueNumber finds existing issue', async () => {
    githubFetch.mockResolvedValueOnce([{ title: 'agent-bus', number: 5 }]);
    const agentBus = await loadAgentBus();
    const num = await agentBus.getIssueNumber('agent-bus', 'me', 'repo');
    expect(num).toBe(5);
  });

  it('getIssueNumber returns null when not found', async () => {
    githubFetch.mockResolvedValueOnce([]);
    const agentBus = await loadAgentBus();
    const num = await agentBus.getIssueNumber('agent-bus', 'me', 'repo');
    expect(num).toBeNull();
  });

  it('createIssue posts to GitHub', async () => {
    githubFetch.mockResolvedValueOnce({ number: 7 });
    const agentBus = await loadAgentBus();
    const num = await agentBus.createIssue('t', 'b', 'me', 'repo');
    expect(num).toBe(7);
    expect(githubFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('updateIssue patches GitHub', async () => {
    githubFetch.mockResolvedValueOnce({});
    const agentBus = await loadAgentBus();
    await agentBus.updateIssue(3, 'b', 'me', 'repo');
    expect(githubFetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/3'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('main creates a new issue when none exists', async () => {
    process.env.GH_TOKEN = 't';
    process.env.GH_REPO = 'me/repo';
    githubFetch.mockResolvedValueOnce([]).mockResolvedValueOnce({ number: 8 });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const agentBus = await loadAgentBus();
    await agentBus.main();
    expect(githubFetch).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('Created')
    );
  });

  it('main updates an existing issue', async () => {
    process.env.GH_TOKEN = 't';
    process.env.GH_REPO = 'me/repo';
    githubFetch
      .mockResolvedValueOnce([{ title: 'agent-bus', number: 2 }])
      .mockResolvedValueOnce({});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const agentBus = await loadAgentBus();
    await agentBus.main();
    expect(githubFetch).toHaveBeenCalledTimes(2);
    expect(logSpy).toHaveBeenCalledWith(
      '[INFO]',
      expect.stringContaining('Updated')
    );
  });

  it('main logs error when GH_TOKEN missing', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    process.env.GH_REPO = 'me/repo';
    const agentBus = await loadAgentBus();
    await agentBus.main();
    expect(errSpy).toHaveBeenCalledWith(
      '[ERROR]',
      expect.stringContaining('GH_TOKEN not set')
    );
  });

  it('main throws when repo not set', async () => {
    process.env.GH_TOKEN = 't';
    const agentBus = await loadAgentBus();
    await expect(agentBus.main()).rejects.toThrow(
      'GH_REPO or GITHUB_REPOSITORY not set'
    );
  });
});
