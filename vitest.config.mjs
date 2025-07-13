import { defineConfig } from 'vitest/config';
import alias from './paths.js';

export default defineConfig({
  resolve: { alias },
  test: {
    environment: 'node',
    include: ['test/**/*.test.{ts,js,mjs,cjs}'], // Include all test files
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
