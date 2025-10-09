/**
 * Markdown parsing and sanitization utilities
 * Uses marked + DOMPurify for secure Markdown → HTML conversion
 */

import DOMPurify from 'dompurify';
import { marked } from 'marked';

// Configure marked with GFM (GitHub Flavored Markdown)
// GFM is enabled by default in marked v4+, but we can explicitly enable it
marked.setOptions({
  gfm: true, // Enable GitHub Flavored Markdown
  breaks: false, // Don't convert \n to <br> (GFM spec)
});

/**
 * Emoji metadata for shortcode replacement
 */
export interface EmojiMetadata {
  shortcode: string;
  blobURI: string;
  animated: boolean;
}

/**
 * Parse Markdown text to HTML
 * Supports GFM extended syntax: tables, strikethrough, task lists
 *
 * @param text - Markdown source text
 * @returns Parsed HTML (unsanitized)
 */
export function parseMarkdown(text: string): string {
  return marked.parse(text) as string;
}

/**
 * Sanitize HTML to prevent XSS attacks
 * Blocks raw HTML passthrough and dangerous attributes
 *
 * @param html - Raw HTML from Markdown parser
 * @returns Sanitized HTML safe for rendering
 */
export function sanitizeMarkdown(html: string): string {
  // Add hook to block dangerous protocols (data:, javascript:, etc.)
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Check for dangerous protocols in src/href attributes
    if ('src' in node || 'href' in node) {
      const attr = 'src' in node ? 'src' : 'href';
      const value = node.getAttribute(attr);
      if (value) {
        // Block data:, javascript:, vbscript:, and other dangerous protocols
        if (
          value.startsWith('data:') ||
          value.startsWith('javascript:') ||
          value.startsWith('vbscript:')
        ) {
          node.removeAttribute(attr);
        }
      }
    }
  });

  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'br',
      'strong',
      'em',
      'code',
      'pre',
      'ul',
      'ol',
      'li',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'del',
      'input',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'blockquote',
      'a',
      'img',
    ],
    ALLOWED_ATTR: ['type', 'checked', 'disabled', 'href', 'src', 'alt', 'title', 'class'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
  });

  // Remove hook after use to prevent side effects
  DOMPurify.removeHook('afterSanitizeAttributes');

  return sanitized;
}

/**
 * Replace emoji shortcodes with <img> tags
 * Preserves shortcodes in code blocks (no replacement)
 *
 * @param html - Sanitized HTML
 * @param emojiRegistry - Map of shortcode to emoji metadata
 * @returns HTML with emoji shortcodes replaced by <img> tags
 */
export function replaceEmojiShortcodes(
  html: string,
  emojiRegistry: Map<string, EmojiMetadata>
): string {
  // Track whether we're inside a code block or inline code
  let inCodeBlock = false;
  let inInlineCode = false;

  // Split by tags to process only text nodes
  const parts = html.split(/(<[^>]+>)/g);

  return parts
    .map((part) => {
      // Check if entering/exiting code block
      if (part === '<pre>' || part.startsWith('<pre ')) {
        inCodeBlock = true;
        return part;
      }
      if (part === '</pre>') {
        inCodeBlock = false;
        return part;
      }

      // Check if entering/exiting inline code
      if (part === '<code>' || part.startsWith('<code ')) {
        inInlineCode = true;
        return part;
      }
      if (part === '</code>') {
        inInlineCode = false;
        return part;
      }

      // If it's a tag or we're in code, don't process
      if (part.startsWith('<') || inCodeBlock || inInlineCode) {
        return part;
      }

      // Replace shortcodes in text nodes
      return part.replace(/:([a-z0-9_+-]+):/gi, (match, shortcode) => {
        const emoji = emojiRegistry.get(shortcode.toLowerCase());
        if (!emoji) {
          // Keep original shortcode if emoji not found
          return match;
        }

        // Replace with <img> tag
        const animatedClass = emoji.animated ? ' class="emoji-animated"' : '';
        return `<img src="${emoji.blobURI}" alt=":${shortcode}:" title=":${shortcode}:"${animatedClass} class="emoji" />`;
      });
    })
    .join('');
}

/**
 * Full Markdown rendering pipeline
 * Parse → Sanitize → Replace emoji shortcodes
 *
 * @param markdown - Markdown source text
 * @param emojiRegistry - Optional emoji registry for shortcode replacement
 * @returns Sanitized HTML with emoji shortcodes replaced
 */
export function renderMarkdown(
  markdown: string,
  emojiRegistry?: Map<string, EmojiMetadata>
): string {
  const html = parseMarkdown(markdown);
  const sanitized = sanitizeMarkdown(html);

  if (emojiRegistry && emojiRegistry.size > 0) {
    return replaceEmojiShortcodes(sanitized, emojiRegistry);
  }

  return sanitized;
}
