import sanitizeHtml from 'sanitize-html';

export function sanitizeMarkdown(markdown) {
  return sanitizeHtml(markdown, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
