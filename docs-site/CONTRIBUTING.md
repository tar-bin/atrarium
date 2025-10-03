# Contributing to Atrarium Documentation

Thank you for contributing to Atrarium documentation!

## Adding New Pages

### 1. Create English Page

```bash
# Create markdown file
touch docs-site/en/guide/new-page.md
```

Add frontmatter:

```yaml
---
title: New Page Title
description: Page description for SEO
order: 5
---

# New Page Title

Content here...
```

### 2. Create Japanese Translation

```bash
# Mirror file structure
touch docs-site/ja/guide/new-page.md
```

Translate content, preserve frontmatter structure:

```yaml
---
title: 新しいページタイトル
description: SEO用のページ説明
order: 5
---

# 新しいページタイトル

コンテンツ...
```

### 3. Add to Navigation

Edit `.vitepress/locales/en.ts`:

```typescript
{
  text: 'New Page',
  link: '/en/guide/new-page'
}
```

Edit `.vitepress/locales/ja.ts`:

```typescript
{
  text: '新しいページ',
  link: '/ja/guide/new-page'
}
```

## Translation Guidelines

- **Preserve structure**: Frontmatter keys must match
- **Update links**: Use locale prefix (`/en/` or `/ja/`)
- **Technical terms**: Keep technical terms in English (API, DID, etc.)
- **Code samples**: Keep code in English
- **File paths**: Must mirror exactly (`en/guide/page.md` ↔ `ja/guide/page.md`)

## Style Guide

### Markdown

- Use `##` for main headings (not `#`, reserved for title)
- Use code fences with language: ` ```typescript `
- Use tables for structured data
- Use callouts for important notes:

```markdown
::: tip
Helpful tip here
:::

::: warning
Warning message
:::
```

### Links

- **Internal links**: Use absolute paths (`/en/guide/overview`)
- **External links**: Use full URLs (`https://example.com`)
- **No cross-locale links**: English pages link to `/en/*`, Japanese to `/ja/*`

## Testing Your Changes

```bash
# Install dependencies
npm install

# Start dev server
npm run docs:dev

# Build to check for errors
npm run docs:build

# Run validation tests
npm run test:docs
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b docs/your-feature`
3. Make changes (English + Japanese)
4. Test locally
5. Commit with descriptive message
6. Push and create PR
7. Wait for review

## Translation Workflow

### For Major Updates

1. Update English version first
2. Mark Japanese version as outdated (add warning)
3. Translate changes
4. Remove outdated warning

### Outdated Page Warning

```markdown
---
title: 概要
outdated: true
outdatedSince: 2025-10-03
---

:::warning
このページは英語版に対して古い可能性があります。[最新の英語版を確認](/en/guide/overview)
:::
```

## Questions?

- Check [VitePress docs](https://vitepress.dev/)
- Open an issue on GitHub
- Ask in discussions
