import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js,mjs,cjs}'], // Only include tests in the 'test' directory
    exclude: ['test/agent-bus.test.mjs'], // Still exclude this one for now
    coverage: {
      include: [
        'scripts/fetch-gh-repos.mjs',
        'scripts/classify-inbox.mjs',
        'scripts/agent-bus.mjs',
        'scripts/utils/github.mjs',
      ],
      reporter: ['text', 'lcov'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
