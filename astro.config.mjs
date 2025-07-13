import rehypeExternalLinks from 'rehype-external-links';

export default {
  site: 'https://github.adrianwedd.com',
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
};
