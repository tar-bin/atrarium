# Data Model: VitePress Documentation Site

**Feature**: VitePress Documentation Site
**Date**: 2025-10-03
**Status**: Complete

## Overview

The VitePress documentation site uses a file-based data model where documentation pages are markdown files organized in a hierarchical directory structure. Configuration is TypeScript-based, and navigation/i18n data is declared in code.

## Entities

### 1. Documentation Page

Represents a single documentation page (markdown file).

**Attributes**:
- `path`: string - Relative file path (e.g., `en/guide/overview.md`)
- `url`: string - Public URL path (e.g., `/en/guide/overview`)
- `title`: string - Page title (from frontmatter `title` or first `# heading`)
- `description`: string - Meta description for SEO (from frontmatter `description`)
- `locale`: "en" | "ja" - Language of the page
- `category`: "guide" | "architecture" | "reference" - Documentation category
- `order`: number - Order within sidebar section (from frontmatter `order` or filename)
- `lastModified`: timestamp - Last Git commit timestamp for the file
- `frontmatter`: object - YAML frontmatter data (title, description, custom fields)
- `content`: string - Markdown content body
- `headings`: Heading[] - Extracted headings for table of contents

**Frontmatter Example**:
```yaml
---
title: Project Overview
description: Introduction to Atrarium architecture and design philosophy
order: 1
---
```

**Validation Rules**:
- `title` is required (either in frontmatter or as H1)
- `path` must match locale directory structure (en/ or ja/)
- `locale` must be one of configured locales
- `category` must match directory name (guide/, architecture/, reference/)

**Relationships**:
- Belongs to one `Locale` (en or ja)
- Belongs to one `Category` (guide, architecture, reference)
- May have one corresponding translation (en ↔ ja)

---

### 2. Navigation Structure

Represents the sidebar and navbar configuration for the documentation site.

**Attributes**:
- `sidebar`: SidebarConfig - Hierarchical sidebar menu structure
- `nav`: NavItem[] - Top navigation bar items
- `socialLinks`: SocialLink[] - Social media links in navbar
- `footer`: FooterConfig - Footer content and links
- `locale`: "en" | "ja" - Locale this navigation is for

**SidebarConfig Structure**:
```typescript
type SidebarConfig = SidebarGroup[]

interface SidebarGroup {
  text: string           // Section title (e.g., "Guide")
  collapsed?: boolean    // Initially collapsed (default: false)
  items: SidebarItem[]   // Pages in this section
}

interface SidebarItem {
  text: string           // Link text (e.g., "Overview")
  link: string           // URL path (e.g., "/guide/overview")
  items?: SidebarItem[]  // Nested items (for subsections)
}
```

**NavItem Structure**:
```typescript
interface NavItem {
  text: string           // Nav link text (e.g., "Guide")
  link: string           // URL path or external link
  activeMatch?: string   // Regex to mark as active (e.g., "^/guide/")
}
```

**Validation Rules**:
- All sidebar links must point to existing documentation pages
- Sidebar structure must be identical across locales (only text differs)
- Nav items can include external links (e.g., GitHub)

**Example** (English):
```typescript
sidebar: [
  {
    text: 'Guide',
    items: [
      { text: 'Overview', link: '/guide/overview' },
      { text: 'Setup', link: '/guide/setup' },
      { text: 'Quickstart', link: '/guide/quickstart' }
    ]
  },
  {
    text: 'Architecture',
    items: [
      { text: 'System Design', link: '/architecture/system-design' },
      { text: 'Database', link: '/architecture/database' }
    ]
  }
]
```

---

### 3. Locale Configuration

Represents a language/region configuration for internationalization.

**Attributes**:
- `code`: "en" | "ja" - Locale code
- `label`: string - Display name (e.g., "English", "日本語")
- `lang`: string - HTML lang attribute (e.g., "en-US", "ja-JP")
- `link`: string - Base path for locale (e.g., "/en/", "/ja/")
- `dir`: "ltr" | "rtl" - Text direction (default: "ltr")
- `title`: string - Site title for this locale
- `description`: string - Site description for this locale
- `themeConfig`: NavigationStructure - Locale-specific nav/sidebar

**Validation Rules**:
- `code` must be unique
- `link` must start and end with `/`
- All locales must have identical page structure (parity requirement)

**Example**:
```typescript
{
  en: {
    code: 'en',
    label: 'English',
    lang: 'en-US',
    link: '/en/',
    title: 'Atrarium Documentation',
    description: 'Community management system on AT Protocol',
    themeConfig: { /* English nav/sidebar */ }
  },
  ja: {
    code: 'ja',
    label: '日本語',
    lang: 'ja-JP',
    link: '/ja/',
    title: 'Atrariumドキュメント',
    description: 'AT Protocol上のコミュニティ管理システム',
    themeConfig: { /* Japanese nav/sidebar */ }
  }
}
```

---

### 4. Theme Configuration

Represents visual theme and UI component settings.

**Attributes**:
- `colorMode`: "light" | "dark" | "auto" - Default color mode
- `logo`: string - Path to logo image (e.g., "/logo.svg")
- `siteTitle`: string | false - Text next to logo (false hides title)
- `search`: SearchConfig - Search configuration
- `editLink`: EditLinkConfig - "Edit this page" link configuration
- `socialLinks`: SocialLink[] - Social media icons in navbar
- `footer`: FooterConfig - Footer content

**SearchConfig**:
```typescript
interface SearchConfig {
  provider: 'local' | 'algolia'  // Search provider
  options?: {
    placeholder?: string           // Search input placeholder
    translations?: {               // i18n for search UI
      button: { buttonText: string }
      modal: { /* modal translations */ }
    }
  }
}
```

**EditLinkConfig**:
```typescript
interface EditLinkConfig {
  pattern: string     // GitHub edit URL pattern
  text?: string       // Link text (default: "Edit this page")
}
```

**Example**:
```typescript
{
  logo: '/atrarium-logo.svg',
  search: {
    provider: 'local',
    options: {
      placeholder: 'Search documentation...'
    }
  },
  editLink: {
    pattern: 'https://github.com/tar-bin/atrarium/edit/main/docs-site/:path',
    text: 'Edit this page on GitHub'
  },
  socialLinks: [
    { icon: 'github', link: 'https://github.com/tar-bin/atrarium' }
  ]
}
```

---

### 5. Table of Contents (TOC)

Represents the auto-generated heading hierarchy for a documentation page.

**Attributes**:
- `pageUrl`: string - URL of the page this TOC belongs to
- `headings`: Heading[] - Extracted headings from markdown

**Heading Structure**:
```typescript
interface Heading {
  level: 1 | 2 | 3 | 4 | 5 | 6    // Heading level
  text: string                     // Heading text
  slug: string                     // URL fragment (#introduction)
  children?: Heading[]             // Nested headings
}
```

**Generation Rules**:
- Extracted from markdown during build
- Only levels 2-3 shown in right sidebar by default (configurable)
- Nested structure reflects heading hierarchy

**Example**:
```typescript
{
  pageUrl: '/en/architecture/system-design',
  headings: [
    {
      level: 2,
      text: 'Architecture Overview',
      slug: 'architecture-overview',
      children: [
        {
          level: 3,
          text: 'Cloudflare Workers',
          slug: 'cloudflare-workers'
        },
        {
          level: 3,
          text: 'D1 Database',
          slug: 'd1-database'
        }
      ]
    },
    {
      level: 2,
      text: 'Data Flow',
      slug: 'data-flow'
    }
  ]
}
```

---

## Data Relationships

```
Locale (en, ja)
  ├─ 1:N → Documentation Pages
  ├─ 1:1 → Navigation Structure
  └─ 1:1 → Theme Configuration

Documentation Page
  ├─ N:1 → Locale
  ├─ N:1 → Category (guide/architecture/reference)
  ├─ 0:1 → Documentation Page (translation pair)
  └─ 1:1 → Table of Contents

Navigation Structure
  ├─ 1:1 → Locale
  └─ N:N → Documentation Pages (via links)

Theme Configuration
  ├─ 1:1 → Locale
  └─ Global settings (shared across locales)
```

---

## File System Mapping

The data model maps directly to the file system:

```
docs-site/
├── en/                          # Locale: en
│   ├── index.md                 # Page: /en/ (homepage)
│   ├── guide/                   # Category: guide
│   │   ├── overview.md          # Page: /en/guide/overview
│   │   └── setup.md             # Page: /en/guide/setup
│   ├── architecture/            # Category: architecture
│   │   └── system-design.md     # Page: /en/architecture/system-design
│   └── reference/               # Category: reference
│       └── api-reference.md     # Page: /en/reference/api-reference
├── ja/                          # Locale: ja (mirrors en/)
│   ├── index.md
│   ├── guide/
│   ├── architecture/
│   └── reference/
├── .vitepress/
│   ├── config.ts                # Locale config, theme config
│   └── locales/
│       ├── en.ts                # Navigation structure (en)
│       └── ja.ts                # Navigation structure (ja)
└── public/
    └── images/                  # Static assets (not part of data model)
```

---

## Validation & Constraints

### Content Parity (i18n)
- Every `en/*.md` file MUST have corresponding `ja/*.md` file
- File paths must mirror exactly: `en/guide/overview.md` ↔ `ja/guide/overview.md`
- Frontmatter structure must match (same keys, localized values)

### Navigation Consistency
- Sidebar structure must be identical across locales (only `text` differs)
- All sidebar links must resolve to existing pages
- No broken links allowed in navigation

### Build-time Validation
- TypeScript config compilation must succeed
- All markdown files must have valid frontmatter
- All internal links must resolve (no 404s)
- TOC generation must succeed for all pages

---

## State Transitions

Documentation pages have no runtime state (static site). However, content lifecycle:

1. **Draft**: Markdown file exists but not linked in navigation
2. **Published**: Added to sidebar, visible to users
3. **Updated**: Git commit updates `lastModified` timestamp
4. **Deprecated**: Removed from sidebar, file may remain with notice
5. **Archived**: File deleted or moved to archive/ directory

---

## Performance Considerations

- **Build-time**: All pages pre-rendered to static HTML (SSG)
- **Runtime**: Minimal JavaScript, instant page navigation (SPA routing)
- **Search index**: Generated at build time, loaded on-demand
- **Images**: Vite optimizes and fingerprints static assets
- **Cache**: Cloudflare Pages CDN caches all static assets globally

---

## Next Steps

Data model complete. Proceed to:
1. Create contracts/navigation.md (sidebar/nav structure contract)
2. Create contracts/i18n.md (locale parity contract)
3. Create quickstart.md (developer quick reference)
