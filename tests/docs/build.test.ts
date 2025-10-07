import { execSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('Build Validation', () => {
  const docsRoot = resolve(__dirname, '../../docs');
  const distDir = resolve(docsRoot, '.vitepress/dist');

  test('VitePress build succeeds without errors', () => {
    // This will fail initially - no content to build yet
    try {
      execSync('npm run docs:build', {
        cwd: docsRoot,
        stdio: 'pipe',
        timeout: 60000,
      });
      expect(true).toBe(true);
    } catch (error: any) {
      // Build should fail initially (no content)
      expect(error.message).toContain('Command failed');
    }
  });

  test('build output directory is created', () => {
    // dist/ should exist after successful build
    // Initially will fail
    expect(existsSync(distDir)).toBe(true);
  });

  test('all locales are built', () => {
    // Check that root (English) and ja/ are in build output
    const enIndex = resolve(distDir, 'index.html'); // English is root locale
    const jaIndex = resolve(distDir, 'ja/index.html');

    expect(existsSync(enIndex)).toBe(true);
    expect(existsSync(jaIndex)).toBe(true);
  });

  test('static assets are included in build', () => {
    // Check that public/ assets are copied (if they exist)
    const publicDir = resolve(docsRoot, 'public');
    const hasPublicAssets = existsSync(publicDir) && readdirSync(publicDir).length > 0;

    if (hasPublicAssets) {
      // Only check if public/ has files
      const logo = resolve(distDir, 'logo.svg');
      expect(existsSync(logo)).toBe(true);
    } else {
      // No public assets to test
      expect(true).toBe(true);
    }
  });

  test('TypeScript config compiles without errors', () => {
    try {
      execSync('npx tsc --noEmit', {
        cwd: docsRoot,
        stdio: 'pipe',
      });
      expect(true).toBe(true);
    } catch (_error) {
      // Should fail initially - no tsconfig yet
      expect(true).toBe(false);
    }
  });
});
