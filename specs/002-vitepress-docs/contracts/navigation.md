# Navigation Contract: VitePress Documentation Site

**Feature**: VitePress Documentation Site
**Date**: 2025-10-03
**Contract Type**: Navigation Structure
**Status**: Draft

## Purpose

This contract defines the exact navigation structure (sidebar and navbar) for the Atrarium documentation site. The structure must be identical across all locales (only display text differs).

## Sidebar Structure

### English Locale (`en`)

```yaml
sidebar:
  # Section 1: Guide (Getting Started)
  - text: "Guide"
    collapsed: false
    items:
      - text: "Overview"
        link: "/en/guide/overview"
      - text: "Setup"
        link: "/en/guide/setup"
      - text: "Quickstart"
        link: "/en/guide/quickstart"

  # Section 2: Architecture (System Design)
  - text: "Architecture"
    collapsed: false
    items:
      - text: "System Design"
        link: "/en/architecture/system-design"
      - text: "Database Schema"
        link: "/en/architecture/database"
      - text: "API Design"
        link: "/en/architecture/api"

  # Section 3: Reference (Advanced Topics)
  - text: "Reference"
    collapsed: false
    items:
      - text: "API Reference"
        link: "/en/reference/api-reference"
      - text: "Implementation Guide"
        link: "/en/reference/implementation"
      - text: "Development Spec"
        link: "/en/reference/development-spec"
```

### Japanese Locale (`ja`)

```yaml
sidebar:
  # セクション1: ガイド (はじめに)
  - text: "ガイド"
    collapsed: false
    items:
      - text: "概要"
        link: "/ja/guide/overview"
      - text: "セットアップ"
        link: "/ja/guide/setup"
      - text: "クイックスタート"
        link: "/ja/guide/quickstart"

  # セクション2: アーキテクチャ (システム設計)
  - text: "アーキテクチャ"
    collapsed: false
    items:
      - text: "システム設計"
        link: "/ja/architecture/system-design"
      - text: "データベーススキーマ"
        link: "/ja/architecture/database"
      - text: "API設計"
        link: "/ja/architecture/api"

  # セクション3: リファレンス (詳細トピック)
  - text: "リファレンス"
    collapsed: false
    items:
      - text: "APIリファレンス"
        link: "/ja/reference/api-reference"
      - text: "実装ガイド"
        link: "/ja/reference/implementation"
      - text: "開発仕様"
        link: "/ja/reference/development-spec"
```

## Top Navigation Bar

### English Locale (`en`)

```yaml
nav:
  - text: "Guide"
    link: "/en/guide/overview"
    activeMatch: "^/en/guide/"

  - text: "Architecture"
    link: "/en/architecture/system-design"
    activeMatch: "^/en/architecture/"

  - text: "Reference"
    link: "/en/reference/api-reference"
    activeMatch: "^/en/reference/"

  - text: "GitHub"
    link: "https://github.com/tar-bin/atrarium"

  - text: "Main Site"
    link: "https://github.com/tar-bin/atrarium#readme"
```

### Japanese Locale (`ja`)

```yaml
nav:
  - text: "ガイド"
    link: "/ja/guide/overview"
    activeMatch: "^/ja/guide/"

  - text: "アーキテクチャ"
    link: "/ja/architecture/system-design"
    activeMatch: "^/ja/architecture/"

  - text: "リファレンス"
    link: "/ja/reference/api-reference"
    activeMatch: "^/ja/reference/"

  - text: "GitHub"
    link: "https://github.com/tar-bin/atrarium"

  - text: "メインサイト"
    link: "https://github.com/tar-bin/atrarium#readme"
```

## Social Links (Shared across locales)

```yaml
socialLinks:
  - icon: "github"
    link: "https://github.com/tar-bin/atrarium"
```

## Edit Link Configuration

### English

```yaml
editLink:
  pattern: "https://github.com/tar-bin/atrarium/edit/main/docs-site/en/:path"
  text: "Edit this page on GitHub"
```

### Japanese

```yaml
editLink:
  pattern: "https://github.com/tar-bin/atrarium/edit/main/docs-site/ja/:path"
  text: "GitHubでこのページを編集"
```

## Footer Configuration

### English

```yaml
footer:
  message: "Released under the MIT License."
  copyright: "Copyright © 2025 Atrarium Contributors"
```

### Japanese

```yaml
footer:
  message: "MITライセンスの下で公開されています。"
  copyright: "Copyright © 2025 Atrarium Contributors"
```

## Validation Rules

### Structural Parity
- ✅ Sidebar MUST have identical structure across locales
- ✅ Number of sections MUST match (3 sections: Guide, Architecture, Reference)
- ✅ Number of items per section MUST match
- ✅ Link paths MUST follow locale pattern (`/en/*` vs `/ja/*`)

### Link Validity
- ✅ All sidebar links MUST point to existing documentation pages
- ✅ All navbar links MUST be valid (internal pages or external URLs)
- ✅ `activeMatch` patterns MUST correctly match route prefixes
- ✅ Edit link pattern MUST resolve to correct GitHub file path

### Text Localization
- ✅ All display text (`text` fields) MUST be localized
- ✅ English uses English terms, Japanese uses Japanese terms
- ✅ Technical terms may be romanized in Japanese (e.g., "API" not "アプリケーションプログラミングインターフェース")

## Contract Tests

### Test 1: Sidebar Structure Parity

```typescript
// tests/docs-site/navigation.test.ts
test('sidebar has identical structure across locales', () => {
  const enSidebar = enConfig.themeConfig.sidebar
  const jaSidebar = jaConfig.themeConfig.sidebar

  expect(enSidebar.length).toBe(jaSidebar.length) // Same number of sections

  enSidebar.forEach((enSection, i) => {
    const jaSection = jaSidebar[i]
    expect(enSection.items.length).toBe(jaSection.items.length) // Same number of items

    enSection.items.forEach((enItem, j) => {
      const jaItem = jaSection.items[j]
      expect(enItem.link.replace('/en/', '/ja/')).toBe(jaItem.link) // Links mirror
    })
  })
})
```

### Test 2: All Links Resolve

```typescript
test('all sidebar links point to existing pages', async () => {
  const allLinks = [...enSidebar, ...jaSidebar]
    .flatMap(section => section.items)
    .map(item => item.link)

  for (const link of allLinks) {
    const filePath = linkToFilePath(link) // /en/guide/overview → docs-site/en/guide/overview.md
    expect(await fileExists(filePath)).toBe(true)
  }
})
```

### Test 3: Active Match Patterns

```typescript
test('activeMatch patterns correctly identify active routes', () => {
  const navItems = enConfig.themeConfig.nav

  // Guide nav item should match /en/guide/* routes
  const guideItem = navItems.find(item => item.text === 'Guide')
  expect('/en/guide/overview').toMatch(new RegExp(guideItem.activeMatch))
  expect('/en/architecture/system-design').not.toMatch(new RegExp(guideItem.activeMatch))
})
```

## Implementation Reference

### TypeScript Config (.vitepress/config.ts)

```typescript
import { defineConfig } from 'vitepress'
import { enNavigation } from './locales/en'
import { jaNavigation } from './locales/ja'

export default defineConfig({
  locales: {
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: enNavigation.nav,
        sidebar: enNavigation.sidebar,
        editLink: enNavigation.editLink,
        footer: enNavigation.footer
      }
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja/',
      themeConfig: {
        nav: jaNavigation.nav,
        sidebar: jaNavigation.sidebar,
        editLink: jaNavigation.editLink,
        footer: jaNavigation.footer
      }
    }
  },
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/tar-bin/atrarium' }
    ]
  }
})
```

## Acceptance Criteria

- [ ] Sidebar has 3 main sections: Guide, Architecture, Reference
- [ ] Each section contains specified items in correct order
- [ ] All sidebar links resolve to existing documentation pages
- [ ] Navbar includes Guide, Architecture, Reference, GitHub, Main Site
- [ ] Edit link opens correct GitHub file for current locale
- [ ] Footer displays license and copyright information
- [ ] Social links show GitHub icon linking to repository
- [ ] Structure is identical across English and Japanese (only text differs)

## Future Extensions

This contract defines the initial navigation structure. Future additions:
- **API section**: When API documentation grows, split into subsections
- **Community section**: Add community guidelines, contributing docs
- **Changelog section**: Add release notes and migration guides
- **Search customization**: Configure search placeholder and translations
