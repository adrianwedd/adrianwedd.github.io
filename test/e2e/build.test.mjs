import { describe, it, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { execa } from 'execa';

describe('E2E: full build', () => {
  it('outputs expected files in dist', async () => {
    const outDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pin-build-'));
    const { exitCode } = await execa('pnpm', [
      'exec',
      'astro',
      'build',
      '--outDir',
      outDir,
    ]);
    expect(exitCode).toBe(0);
    const files = await fs.readdir(outDir);
    expect(files).toContain('index.html');
    await fs.rm(outDir, { recursive: true, force: true });
  }, 20000);
});
