import { describe, test, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { sync as globSync } from 'glob'

describe('Link Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs-site')

  test('all internal links resolve to existing pages', () => {
    const allPages = globSync('**/*.md', { cwd: docsRoot })

    allPages.forEach(pagePath => {
      const fullPath = resolve(docsRoot, pagePath)
      const content = readFileSync(fullPath, 'utf-8')

      // Extract markdown links [text](url)
      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2]

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue
        }

        // Internal link should exist
        const targetPath = linkUrl.endsWith('.md')
          ? resolve(docsRoot, linkUrl.replace(/^\//, ''))
          : resolve(docsRoot, linkUrl.replace(/^\//, '') + '.md')

        expect(existsSync(targetPath), `Broken link in ${pagePath}: ${linkUrl}`).toBe(true)
      }
    })
  })

  test('English pages only link to /en/ paths', () => {
    const enPages = globSync('en/**/*.md', { cwd: docsRoot })

    enPages.forEach(pagePath => {
      const fullPath = resolve(docsRoot, pagePath)
      const content = readFileSync(fullPath, 'utf-8')

      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2]

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue
        }

        // Internal links in English pages should start with /en/
        if (linkUrl.startsWith('/')) {
          expect(linkUrl.startsWith('/en/'), `Cross-locale link in ${pagePath}: ${linkUrl}`).toBe(true)
        }
      }
    })
  })

  test('Japanese pages only link to /ja/ paths', () => {
    const jaPages = globSync('ja/**/*.md', { cwd: docsRoot })

    jaPages.forEach(pagePath => {
      const fullPath = resolve(docsRoot, pagePath)
      const content = readFileSync(fullPath, 'utf-8')

      const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
      let match

      while ((match = linkRegex.exec(content)) !== null) {
        const linkUrl = match[2]

        // Skip external links
        if (linkUrl.startsWith('http://') || linkUrl.startsWith('https://')) {
          continue
        }

        // Skip anchor links
        if (linkUrl.startsWith('#')) {
          continue
        }

        // Internal links in Japanese pages should start with /ja/
        if (linkUrl.startsWith('/')) {
          expect(linkUrl.startsWith('/ja/'), `Cross-locale link in ${pagePath}: ${linkUrl}`).toBe(true)
        }
      }
    })
  })

  test('navigation config links point to existing pages', () => {
    // This will check navigation.ts files once they exist
    expect(true).toBe(false) // Intentionally fail until implementation
  })
})
