import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      include: ['scripts/fetch-gh-repos.mjs'],
      reporter: ['text', 'lcov'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
