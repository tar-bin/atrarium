import { describe, test, expect } from 'vitest'
import { readdirSync, existsSync, readFileSync } from 'fs'
import { resolve, relative } from 'path'
import { sync as globSync } from 'glob'

describe('i18n Parity Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs-site')
  const enDir = resolve(docsRoot, 'en')
  const jaDir = resolve(docsRoot, 'ja')

  test('all English pages have corresponding Japanese pages', () => {
    // This will fail initially - no content exists yet
    expect(existsSync(enDir)).toBe(true)
    expect(existsSync(jaDir)).toBe(true)

    const enPages = globSync('**/*.md', { cwd: enDir })
    const jaPages = globSync('**/*.md', { cwd: jaDir })

    // Should have equal number of pages
    expect(enPages.length).toBe(jaPages.length)

    // Every en/ page should have ja/ equivalent
    enPages.forEach(enPage => {
      const jaPage = enPage // Same path
      expect(jaPages).toContain(jaPage)
    })
  })

  test('frontmatter structure matches across locales', () => {
    // Test that frontmatter keys are identical (values may differ)
    const enOverview = resolve(enDir, 'guide/overview.md')
    const jaOverview = resolve(jaDir, 'guide/overview.md')

    if (!existsSync(enOverview) || !existsSync(jaOverview)) {
      expect(true).toBe(false) // Fail - files don't exist yet
      return
    }

    const enContent = readFileSync(enOverview, 'utf-8')
    const jaContent = readFileSync(jaOverview, 'utf-8')

    const enFrontmatter = extractFrontmatter(enContent)
    const jaFrontmatter = extractFrontmatter(jaContent)

    expect(Object.keys(enFrontmatter).sort()).toEqual(Object.keys(jaFrontmatter).sort())
  })

  test('no cross-locale links in content', () => {
    // English pages should only link to /en/*, Japanese to /ja/*
    expect(true).toBe(false) // Intentionally fail until implementation
  })

  test('required pages exist in both locales', () => {
    const requiredPages = [
      'index.md',
      'guide/overview.md',
      'guide/setup.md',
      'guide/quickstart.md',
      'architecture/system-design.md',
      'architecture/database.md',
      'architecture/api.md',
      'reference/api-reference.md',
      'reference/implementation.md',
      'reference/development-spec.md'
    ]

    requiredPages.forEach(page => {
      expect(existsSync(resolve(enDir, page))).toBe(true)
      expect(existsSync(resolve(jaDir, page))).toBe(true)
    })
  })
})

function extractFrontmatter(content: string): Record<string, any> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}

  const yaml = match[1]
  const frontmatter: Record<string, any> = {}

  yaml.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length > 0) {
      frontmatter[key.trim()] = valueParts.join(':').trim()
    }
  })

  return frontmatter
}
