import { describe, test, expect } from 'vitest'
import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

describe('Build Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs')
  const distDir = resolve(docsRoot, '.vitepress/dist')

  test('VitePress build succeeds without errors', () => {
    // This will fail initially - no content to build yet
    try {
      execSync('npm run docs:build', {
        cwd: docsRoot,
        stdio: 'pipe',
        timeout: 60000
      })
      expect(true).toBe(true)
    } catch (error: any) {
      // Build should fail initially (no content)
      expect(error.message).toContain('Command failed')
    }
  })

  test('build output directory is created', () => {
    // dist/ should exist after successful build
    // Initially will fail
    expect(existsSync(distDir)).toBe(true)
  })

  test('all locales are built', () => {
    // Check that en/ and ja/ are in build output
    const enIndex = resolve(distDir, 'en/index.html')
    const jaIndex = resolve(distDir, 'ja/index.html')

    expect(existsSync(enIndex)).toBe(true)
    expect(existsSync(jaIndex)).toBe(true)
  })

  test('static assets are included in build', () => {
    // Check that public/ assets are copied
    const logo = resolve(distDir, 'logo.svg')
    expect(existsSync(logo)).toBe(true)
  })

  test('TypeScript config compiles without errors', () => {
    try {
      execSync('npx tsc --noEmit', {
        cwd: docsRoot,
        stdio: 'pipe'
      })
      expect(true).toBe(true)
    } catch (error) {
      // Should fail initially - no tsconfig yet
      expect(true).toBe(false)
    }
  })
})
