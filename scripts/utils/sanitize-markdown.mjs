import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// DOMPurify needs a DOM implementation even in Node
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// Strip any potentially dangerous HTML from markdown strings
export function sanitizeMarkdown(text) {
  return DOMPurify.sanitize(text);
}
