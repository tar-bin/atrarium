# Quickstart: VitePress Documentation Site

**Feature**: VitePress Documentation Site
**For**: Developers working on Atrarium documentation
**Date**: 2025-10-03

## Prerequisites

- Node.js 18+ installed
- Git repository cloned
- Basic familiarity with Markdown

## Initial Setup

### 1. Install Dependencies

```bash
cd /workspaces/atrarium/docs-site
npm install
```

### 2. Start Development Server

```bash
npm run docs:dev
```

Visit: http://localhost:5173

The dev server supports:
- ✅ Hot Module Replacement (instant updates)
- ✅ Locale switching (EN ↔ JA)
- ✅ Search (local index)
- ✅ Dark/light mode toggle

### 3. Project Structure Overview

```
docs-site/
├── en/                    # English documentation
│   ├── index.md           # Homepage
│   ├── guide/             # Getting started guides
│   ├── architecture/      # System design docs
│   └── reference/         # API reference, advanced topics
├── ja/                    # Japanese documentation (mirrors en/)
├── .vitepress/
│   ├── config.ts          # Main configuration
│   ├── locales/           # Locale-specific config
│   │   ├── en.ts          # English nav/sidebar
│   │   └── ja.ts          # Japanese nav/sidebar
│   └── theme/             # Custom theme (if needed)
└── public/                # Static assets (images, etc.)
    └── images/
```

## Common Tasks

### Add a New Documentation Page

#### Step 1: Create English Page

```bash
# Create markdown file
touch docs-site/en/guide/new-feature.md
```

```markdown
---
title: New Feature Guide
description: How to use the new feature
order: 4
---

# New Feature Guide

Content here...
```

#### Step 2: Create Japanese Translation

```bash
# Create mirror file
touch docs-site/ja/guide/new-feature.md
```

```markdown
---
title: 新機能ガイド
description: 新機能の使い方
order: 4
---

# 新機能ガイド

コンテンツ...
```

#### Step 3: Add to Navigation

Edit `.vitepress/locales/en.ts`:
```typescript
export const enNavigation = {
  sidebar: [
    {
      text: 'Guide',
      items: [
        { text: 'Overview', link: '/en/guide/overview' },
        { text: 'Setup', link: '/en/guide/setup' },
        { text: 'New Feature', link: '/en/guide/new-feature' }, // ADD THIS
      ]
    }
  ]
}
```

Edit `.vitepress/locales/ja.ts`:
```typescript
export const jaNavigation = {
  sidebar: [
    {
      text: 'ガイド',
      items: [
        { text: '概要', link: '/ja/guide/overview' },
        { text: 'セットアップ', link: '/ja/guide/setup' },
        { text: '新機能', link: '/ja/guide/new-feature' }, // ADD THIS
      ]
    }
  ]
}
```

#### Step 4: Verify

1. Check dev server (auto-reloads)
2. Verify page appears in sidebar
3. Test locale switcher (EN ↔ JA)
4. Verify links work

### Update Existing Documentation

#### Edit English Version

```bash
vim docs-site/en/guide/overview.md
# Make changes, save
```

#### Translate to Japanese

```bash
vim docs-site/ja/guide/overview.md
# Translate changes, save
```

#### Preview Changes

- Dev server hot-reloads automatically
- Check both locales
- Verify internal links still work

### Add Images/Diagrams

#### Step 1: Add Image to Public Directory

```bash
# Create category folder if needed
mkdir -p docs-site/public/images/architecture

# Copy image
cp diagram.png docs-site/public/images/architecture/
```

#### Step 2: Reference in Markdown

```markdown
<!-- English -->
![System Architecture](/images/architecture/diagram.png)

<!-- Japanese (same image, translated alt text) -->
![システムアーキテクチャ](/images/architecture/diagram.png)
```

**Note**: Images are shared across locales. If you need locale-specific images:

```bash
mkdir -p docs-site/public/images/en/
mkdir -p docs-site/public/images/ja/
```

```markdown
<!-- English-specific image -->
![Setup](/images/en/setup-screenshot.png)

<!-- Japanese-specific image -->
![セットアップ](/images/ja/setup-screenshot.png)
```

### Configure Navigation

#### Sidebar Configuration

Edit `.vitepress/locales/en.ts` or `ja.ts`:

```typescript
export const enNavigation = {
  sidebar: [
    {
      text: 'Section Name',        // Section heading
      collapsed: false,             // Initially expanded
      items: [
        {
          text: 'Page Title',       // Link text
          link: '/en/path/to/page'  // URL path
        },
        // Nested items (optional)
        {
          text: 'Parent Page',
          link: '/en/parent',
          items: [
            { text: 'Child Page', link: '/en/parent/child' }
          ]
        }
      ]
    }
  ]
}
```

#### Top Navbar Configuration

```typescript
export const enNavigation = {
  nav: [
    { text: 'Guide', link: '/en/guide/overview', activeMatch: '^/en/guide/' },
    { text: 'API', link: '/en/reference/api', activeMatch: '^/en/reference/' },
    { text: 'GitHub', link: 'https://github.com/tar-bin/atrarium' }
  ]
}
```

### Run Tests

```bash
# Run all tests
npm run test:docs

# Run specific test
npm run test:docs -- navigation.test.ts

# Run in watch mode
npm run test:docs -- --watch
```

**Test Coverage**:
- Navigation structure validation
- i18n parity check (en/ ↔ ja/)
- Link validation (no 404s)
- Build validation

## Build & Deploy

### Local Production Build

```bash
# Build static site
npm run docs:build

# Preview production build
npm run docs:preview
# Visit: http://localhost:4173
```

Build output: `docs-site/.vitepress/dist/`

### Deploy to Cloudflare Pages

#### Option 1: Automatic (GitHub Integration)

1. Connect repository to Cloudflare Pages
2. Set build settings:
   - Build command: `npm run docs:build`
   - Build output directory: `docs-site/.vitepress/dist`
   - Root directory: `/` (or `docs-site` if monorepo)
3. Push to `main` → automatic deployment

#### Option 2: Manual (Wrangler CLI)

```bash
# Build first
npm run docs:build

# Deploy
wrangler pages deploy docs-site/.vitepress/dist --project-name=atrarium-docs
```

### Verify Deployment

1. Visit production URL
2. Test locale switcher
3. Test search functionality
4. Verify images load
5. Check "Edit this page" links

## Troubleshooting

### Dev Server Not Starting

```bash
# Clear cache
rm -rf docs-site/.vitepress/cache
npm run docs:dev
```

### Build Fails

```bash
# Check for syntax errors
npm run typecheck

# Check for broken links
npm run test:docs -- links.test.ts

# Verbose build
DEBUG=vitepress:* npm run docs:build
```

### Search Not Working

```bash
# Rebuild search index
rm -rf docs-site/.vitepress/cache
npm run docs:build
```

### Locale Switching Broken

**Check**:
1. File paths mirror exactly: `en/guide/page.md` ↔ `ja/guide/page.md`
2. Navigation config links use correct locale prefix (`/en/` vs `/ja/`)
3. Frontmatter `title` exists in both versions

### Images Not Loading

**Check**:
1. Image path starts with `/` (e.g., `/images/diagram.png`)
2. Image exists in `docs-site/public/images/`
3. Build includes `public/` directory

## Cheat Sheet

### Markdown Frontmatter

```yaml
---
title: Page Title          # Required: appears in sidebar, <title> tag
description: Page summary  # Optional: meta description for SEO
order: 1                   # Optional: sidebar ordering (lower first)
layout: doc                # Optional: page layout (default: doc)
---
```

### Markdown Features

```markdown
# H1 Heading
## H2 Heading

**Bold** *Italic* `code`

[Link text](/en/path/to/page)

![Image alt](/images/diagram.png)

<!-- Code block with syntax highlighting -->
```typescript
const config = { theme: 'default' }
```

<!-- Callout boxes -->
:::tip
This is a tip
:::

:::warning
This is a warning
:::

:::danger
This is a danger notice
:::

<!-- Table -->
| Column 1 | Column 2 |
|----------|----------|
| Data 1   | Data 2   |
```

### VitePress Commands

```bash
npm run docs:dev          # Start dev server (port 5173)
npm run docs:build        # Build static site
npm run docs:preview      # Preview production build (port 4173)
npm run test:docs         # Run tests
npm run typecheck         # TypeScript validation
```

### File Paths

```bash
# Documentation content
docs-site/en/guide/page.md         → /en/guide/page
docs-site/ja/guide/page.md         → /ja/guide/page

# Static assets
docs-site/public/images/logo.png   → /images/logo.png

# Config
docs-site/.vitepress/config.ts     → Main config
docs-site/.vitepress/locales/en.ts → English nav/sidebar
docs-site/.vitepress/locales/ja.ts → Japanese nav/sidebar
```

## Next Steps

1. ✅ Setup complete → Start adding/editing pages
2. ✅ Pages added → Run tests (`npm run test:docs`)
3. ✅ Tests pass → Build locally (`npm run docs:build`)
4. ✅ Build succeeds → Deploy to Cloudflare Pages
5. ✅ Deployed → Verify production site

## Support

- **VitePress Docs**: https://vitepress.dev/
- **Atrarium Issues**: https://github.com/tar-bin/atrarium/issues
- **Claude Code**: Run `/help` for assistance
