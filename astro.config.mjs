import { defineConfig } from 'astro/config';
import rehypeExternalLinks from 'rehype-external-links';
import image from '@astrojs/image';
import alias from './paths.js';

export default defineConfig({
  site: 'https://github.adrianwedd.com',
  integrations: [image()],
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
