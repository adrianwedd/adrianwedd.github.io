import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sanitizeMarkdown } from '../../scripts/utils/sanitize-markdown.mjs';

describe('sanitizeMarkdown', () => {
  it('strips script tags from input', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (before, after) => {
        const input = `${before}<script>alert(1)</script>${after}`;
        const output = sanitizeMarkdown(input);
        expect(output).not.toMatch(/<script/i);
      })
    );
  });

  it('removes event handler attributes', () => {
    fc.assert(
      fc.property(fc.string(), (payload) => {
        const input = `<img src="x" onerror="${payload}">`;
        const output = sanitizeMarkdown(input);
        expect(output).not.toMatch(/onerror/i);
      })
    );
  });
});
