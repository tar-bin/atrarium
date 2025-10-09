/**
 * Unit tests for Markdown rendering and XSS protection
 * Tests extended syntax, HTML sanitization, emoji replacement, code block preservation
 */

import { describe, expect, it } from 'vitest';
import {
  type EmojiMetadata,
  parseMarkdown,
  renderMarkdown,
  replaceEmojiShortcodes,
  sanitizeMarkdown,
} from '../../src/lib/markdown';

describe('Markdown Rendering', () => {
  describe('parseMarkdown', () => {
    it('should parse basic Markdown to HTML', () => {
      const input = '**bold** and *italic*';
      const output = parseMarkdown(input);

      expect(output).toContain('<strong>bold</strong>');
      expect(output).toContain('<em>italic</em>');
    });

    it('should parse GFM tables', () => {
      const input = `
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
      `.trim();

      const output = parseMarkdown(input);

      expect(output).toContain('<table>');
      expect(output).toContain('<thead>');
      expect(output).toContain('<tbody>');
      expect(output).toContain('<th>Header 1</th>');
      expect(output).toContain('<td>Cell 1</td>');
    });

    it('should parse GFM strikethrough', () => {
      const input = '~~deleted text~~';
      const output = parseMarkdown(input);

      expect(output).toContain('<del>deleted text</del>');
    });

    it('should parse GFM task lists', () => {
      const input = `
- [x] Completed task
- [ ] Incomplete task
      `.trim();

      const output = parseMarkdown(input);

      expect(output).toContain('<input');
      expect(output).toContain('type="checkbox"');
      expect(output).toContain('checked');
    });

    it('should parse code blocks', () => {
      const input = '```js\nconst x = 1;\n```';
      const output = parseMarkdown(input);

      expect(output).toContain('<pre>');
      expect(output).toContain('<code');
      expect(output).toContain('const x = 1;');
    });

    it('should parse inline code', () => {
      const input = 'Use `const x = 1` in JavaScript';
      const output = parseMarkdown(input);

      expect(output).toContain('<code>const x = 1</code>');
    });
  });

  describe('sanitizeMarkdown (XSS Protection)', () => {
    it('should block <script> tags', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeMarkdown(input);

      expect(output).not.toContain('<script>');
      expect(output).not.toContain('alert');
    });

    it('should block javascript: protocol in links', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const output = sanitizeMarkdown(input);

      expect(output).not.toContain('javascript:');
    });

    it('should block data: URIs in images', () => {
      const input = '<img src="data:text/html,<script>alert(\'XSS\')</script>" />';
      const output = sanitizeMarkdown(input);

      expect(output).not.toContain('data:');
    });

    it('should block onclick handlers', () => {
      const input = '<button onclick="alert(\'XSS\')">Click</button>';
      const output = sanitizeMarkdown(input);

      expect(output).not.toContain('onclick');
      expect(output).not.toContain('alert');
    });

    it('should allow safe HTML tags', () => {
      const input = '<p><strong>Bold</strong> and <em>Italic</em></p>';
      const output = sanitizeMarkdown(input);

      expect(output).toContain('<p>');
      expect(output).toContain('<strong>Bold</strong>');
      expect(output).toContain('<em>Italic</em>');
    });

    it('should allow safe link protocols (https)', () => {
      const input = '<a href="https://example.com">Link</a>';
      const output = sanitizeMarkdown(input);

      expect(output).toContain('href="https://example.com"');
    });

    it('should allow safe image protocols (https)', () => {
      const input = '<img src="https://example.com/image.png" alt="Test" />';
      const output = sanitizeMarkdown(input);

      expect(output).toContain('src="https://example.com/image.png"');
      expect(output).toContain('alt="Test"');
    });

    it('should strip unknown/dangerous tags', () => {
      const input = '<iframe src="evil.com"></iframe><object data="evil.com"></object>';
      const output = sanitizeMarkdown(input);

      expect(output).not.toContain('<iframe');
      expect(output).not.toContain('<object');
    });
  });

  describe('replaceEmojiShortcodes', () => {
    const emojiRegistry = new Map<string, EmojiMetadata>([
      [
        'wave',
        {
          shortcode: 'wave',
          blobURI: 'https://example.com/wave.png',
          animated: false,
        },
      ],
      [
        'partyparrot',
        {
          shortcode: 'partyparrot',
          blobURI: 'https://example.com/partyparrot.gif',
          animated: true,
        },
      ],
    ]);

    it('should replace emoji shortcodes with <img> tags', () => {
      const input = '<p>Hello :wave: world</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      expect(output).toContain('<img src="https://example.com/wave.png"');
      expect(output).toContain('alt=":wave:"');
      expect(output).toContain('class="emoji"');
    });

    it('should add animated class for animated emoji', () => {
      const input = '<p>Party time :partyparrot:</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      expect(output).toContain('class="emoji-animated"');
      expect(output).toContain('class="emoji"');
    });

    it('should preserve unknown shortcodes as plain text', () => {
      const input = '<p>Unknown :unknown_emoji: here</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      expect(output).toContain(':unknown_emoji:');
      expect(output).not.toContain('<img');
    });

    it('should NOT replace shortcodes in code blocks', () => {
      const input = '<pre><code>const emoji = ":wave:";</code></pre>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      expect(output).toContain(':wave:');
      expect(output).not.toContain('<img');
    });

    it('should NOT replace shortcodes in inline code', () => {
      const input = '<p>Use <code>:wave:</code> shortcode</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      // Inside <code> tag should remain as shortcode
      expect(output).toContain('<code>:wave:</code>');
    });

    it('should handle multiple emoji in one line', () => {
      const input = '<p>Hello :wave: and party :partyparrot: time!</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      expect(output).toContain('src="https://example.com/wave.png"');
      expect(output).toContain('src="https://example.com/partyparrot.gif"');
    });

    it('should be case-insensitive for shortcodes', () => {
      const input = '<p>Hello :WAVE: and :Wave:</p>';
      const output = replaceEmojiShortcodes(input, emojiRegistry);

      // Both should be replaced (registry uses lowercase)
      const imgCount = (output.match(/<img/g) || []).length;
      expect(imgCount).toBe(2);
    });
  });

  describe('renderMarkdown (Full Pipeline)', () => {
    const emojiRegistry = new Map<string, EmojiMetadata>([
      [
        'smile',
        {
          shortcode: 'smile',
          blobURI: 'https://example.com/smile.png',
          animated: false,
        },
      ],
    ]);

    it('should parse + sanitize + replace emoji', () => {
      const input = '**Hello** :smile: world!';
      const output = renderMarkdown(input, emojiRegistry);

      expect(output).toContain('<strong>Hello</strong>');
      expect(output).toContain('<img src="https://example.com/smile.png"');
      // Shortcode appears in alt/title attributes, which is expected
      expect(output).toContain('alt=":smile:"');
    });

    it('should block XSS and still replace emoji', () => {
      const input = '<script>alert("XSS")</script> Safe text :smile:';
      const output = renderMarkdown(input, emojiRegistry);

      expect(output).not.toContain('<script>');
      expect(output).toContain('<img src="https://example.com/smile.png"');
    });

    it('should preserve emoji shortcodes in code blocks', () => {
      const input = 'Text :smile: and code `const x = ":smile:"` and block:\n```\n:smile:\n```';
      const output = renderMarkdown(input, emojiRegistry);

      // Text emoji should be replaced
      expect(output).toContain('<img src="https://example.com/smile.png"');

      // Code block emoji should NOT be replaced
      expect(output).toContain('<code>const x = ":smile:"</code>');
    });

    it('should handle empty emoji registry gracefully', () => {
      const input = 'Hello :wave: world';
      const output = renderMarkdown(input, new Map());

      expect(output).toContain(':wave:'); // No replacement without registry
      expect(output).not.toContain('<img');
    });

    it('should handle no emoji registry (undefined)', () => {
      const input = '**Hello** :wave:';
      const output = renderMarkdown(input);

      expect(output).toContain('<strong>Hello</strong>');
      expect(output).toContain(':wave:'); // No replacement
      expect(output).not.toContain('<img');
    });

    it('should handle complex Markdown with GFM + emoji', () => {
      const input = `
# Title :smile:

- Task 1 :smile:
- [x] Completed :smile:

| Header |
|--------|
| :smile: Cell |

~~Deleted :smile:~~

\`\`\`js
const emoji = ":smile:";
\`\`\`
      `.trim();

      const output = renderMarkdown(input, emojiRegistry);

      // Check GFM features
      expect(output).toContain('<h1>');
      expect(output).toContain('<table>');
      expect(output).toContain('<del>');

      // Check emoji replacement (not in code)
      const imgCount = (output.match(/<img/g) || []).length;
      expect(imgCount).toBeGreaterThan(0);

      // Check code block preservation
      expect(output).toContain('const emoji = ":smile:"');
    });
  });
});
