import { describe, test, expect } from 'vitest'
import { readdirSync, existsSync, readFileSync } from 'fs'
import { resolve, relative } from 'path'
import { sync as globSync } from 'glob'

describe('i18n Parity Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs')
  const enDir = docsRoot // English is root locale
  const jaDir = resolve(docsRoot, 'ja')

  test('all English pages have corresponding Japanese pages', () => {
    expect(existsSync(enDir)).toBe(true)
    expect(existsSync(jaDir)).toBe(true)

    // Get English pages (exclude ja/ directory, node_modules, and meta files)
    const enPages = globSync('**/*.md', {
      cwd: enDir,
      ignore: [
        'ja/**',
        'node_modules/**',
        '.vitepress/**',
        'CONTRIBUTING.md', // Meta file, not content
        'DEPLOYMENT.md',   // Meta file, not content
        'README.md'        // Meta file, not content
      ]
    })
    const jaPages = globSync('**/*.md', { cwd: jaDir })

    // Should have equal number of pages
    expect(enPages.length).toBe(jaPages.length)

    // Every English page should have ja/ equivalent
    enPages.forEach(enPage => {
      const jaPage = enPage // Same relative path
      expect(jaPages).toContain(jaPage)
    })
  })

  test('frontmatter structure matches across locales', () => {
    // Test that frontmatter keys are identical (values may differ)
    const enConcept = resolve(enDir, 'guide/concept.md')
    const jaConcept = resolve(jaDir, 'guide/concept.md')

    if (!existsSync(enConcept) || !existsSync(jaConcept)) {
      expect(true).toBe(false) // Fail - files don't exist yet
      return
    }

    const enContent = readFileSync(enConcept, 'utf-8')
    const jaContent = readFileSync(jaConcept, 'utf-8')

    const enFrontmatter = extractFrontmatter(enContent)
    const jaFrontmatter = extractFrontmatter(jaContent)

    expect(Object.keys(enFrontmatter).sort()).toEqual(Object.keys(jaFrontmatter).sort())
  })

  test('no cross-locale links in content', () => {
    // English pages should use root paths (/guide/...), Japanese should use /ja/ prefix
    const jaPages = globSync('**/*.md', { cwd: jaDir })

    let hasViolations = false
    const violations: string[] = []

    jaPages.forEach(page => {
      const content = readFileSync(resolve(jaDir, page), 'utf-8')
      // Japanese pages should not link to root paths (except external links)
      const rootLinks = content.match(/\]\(\/(?!ja\/)[a-z]/g)
      if (rootLinks) {
        hasViolations = true
        violations.push(`${page}: ${rootLinks.join(', ')}`)
      }
    })

    if (hasViolations) {
      console.log('Cross-locale link violations:', violations)
    }
    expect(hasViolations).toBe(false)
  })

  test('required pages exist in both locales', () => {
    const requiredPages = [
      'index.md',
      'guide/concept.md',
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
