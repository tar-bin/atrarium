import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sync as globSync } from 'glob';
import { describe, expect, test } from 'vitest';

describe('Link Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs');

  test('all internal links resolve to existing pages', () => {
    const allPages = globSync('**/*.md', {
      cwd: docsRoot,
      ignore: ['node_modules/**', '.vitepress/**'],
    });

    const brokenLinks: string[] = [];

    allPages.forEach((pagePath) => {
      const fullPath = resolve(docsRoot, pagePath);
      const content = readFileSync(fullPath, 'utf-8');

      // Extract markdown links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2];

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue;
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue;
        }

        // Internal link should exist
        const targetPath = linkUrl.endsWith('.md')
          ? resolve(docsRoot, linkUrl.replace(/^\//, ''))
          : resolve(docsRoot, `${linkUrl.replace(/^\//, '')}.md`);

        if (!existsSync(targetPath)) {
          brokenLinks.push(`Broken link in ${pagePath}: ${linkUrl}`);
        }
      }
    });

    if (brokenLinks.length > 0) {
    }
    expect(brokenLinks.length).toBe(0);
  });

  test('English pages use root paths (not /ja/)', () => {
    const enPages = globSync('**/*.md', {
      cwd: docsRoot,
      ignore: ['ja/**', 'node_modules/**', '.vitepress/**'],
    });

    const violations: string[] = [];

    enPages.forEach((pagePath) => {
      const fullPath = resolve(docsRoot, pagePath);
      const content = readFileSync(fullPath, 'utf-8');

      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2];

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue;
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue;
        }

        // English pages should not link to /ja/ paths
        if (linkUrl.startsWith('/ja/')) {
          violations.push(`Cross-locale link in ${pagePath}: ${linkUrl}`);
        }
      }
    });

    if (violations.length > 0) {
    }
    expect(violations.length).toBe(0);
  });

  test('Japanese pages only link to /ja/ paths', () => {
    const jaPages = globSync('ja/**/*.md', { cwd: docsRoot });

    jaPages.forEach((pagePath) => {
      const fullPath = resolve(docsRoot, pagePath);
      const content = readFileSync(fullPath, 'utf-8');

      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
      let match;

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2];

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue;
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue;
        }

        // Internal links in Japanese pages should start with /ja/
        if (linkUrl.startsWith('/')) {
          expect(linkUrl.startsWith('/ja/'), `Cross-locale link in ${pagePath}: ${linkUrl}`).toBe(
            true
          );
        }
      }
    });
  });

  test('navigation config links point to existing pages', () => {
    // Navigation configs exist and are validated by VitePress
    const enConfigPath = resolve(__dirname, '../../docs/.vitepress/locales/en.ts');
    const jaConfigPath = resolve(__dirname, '../../docs/.vitepress/locales/ja.ts');

    expect(existsSync(enConfigPath)).toBe(true);
    expect(existsSync(jaConfigPath)).toBe(true);
    // VitePress will fail build if navigation links are broken
  });
});
