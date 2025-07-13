import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
// Use Astro's built-in asset pipeline instead of the deprecated `@astrojs/image` plugin.
// See https://docs.astro.build/en/guides/assets/ for details.
import alias from './paths.js';

export default defineConfig({
  site: 'https://github.adrianwedd.com',
  // built-in assets require no integration setup
  markdown: {
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener', 'noreferrer', 'nofollow'],
        },
      ],
    ],
  },
  vite: {
    resolve: {
      alias,
    },
  },
});
