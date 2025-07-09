import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js,mjs,cjs}'], // Only include tests in the 'test' directory
    exclude: ['test/integration.test.mjs'], // Integration test still excluded due to heavy mocks
    coverage: {
      include: [
        'scripts/fetch-gh-repos.mjs',
        'scripts/classify-inbox.mjs',
        'scripts/agent-bus.mjs',
        'scripts/utils/github.mjs',
        'scripts/build-insights.mjs',
      ],
      reporter: ['text', 'lcov'],
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
});
