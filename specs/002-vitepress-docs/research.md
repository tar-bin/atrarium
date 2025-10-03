# Research: VitePress Documentation Site

**Feature**: VitePress Documentation Site
**Date**: 2025-10-03
**Status**: Complete

## Research Questions & Decisions

### 1. Static Site Generator Selection

**Question**: Which static site generator is best suited for technical documentation with i18n support?

**Options Evaluated**:
- VitePress (Vue 3 based)
- Docusaurus (React based)
- MkDocs (Python based)
- GitBook
- Nextra (Next.js based)

**Decision**: VitePress

**Rationale**:
- **Native i18n support**: Built-in localization without plugins
- **Performance**: Vite-powered, extremely fast dev server and builds
- **Vue 3 ecosystem**: Modern, well-maintained, active community
- **Markdown-centric**: Focused on documentation use case
- **Customization**: TypeScript config, custom Vue components when needed
- **Search**: Built-in local search (no external dependencies)
- **Theme**: Default theme is production-ready, responsive, accessible

**Alternatives Rejected**:
- Docusaurus: Heavier bundle, React (not aligned with Atrarium's potential future Vue usage)
- MkDocs: Python dependency, less modern feel, weaker i18n
- GitBook: Commercial platform, vendor lock-in
- Nextra: Newer, less mature, Next.js overhead

**References**:
- https://vitepress.dev/
- https://vitepress.dev/guide/i18n
- https://github.com/vuejs/vitepress

---

### 2. Internationalization (i18n) Strategy

**Question**: How to implement English/Japanese bilingual documentation?

**Options Evaluated**:
- VitePress built-in i18n (locales config)
- Custom i18n plugin (e.g., vite-plugin-i18n)
- Separate repos for each language
- Git submodules for translations

**Decision**: VitePress built-in i18n with `locales` config

**Rationale**:
- **Zero dependencies**: No additional packages needed
- **File-based organization**: en/ and ja/ directories mirror each other
- **Language switcher**: Automatic UI component in navbar
- **Locale-aware routing**: /en/guide/overview vs /ja/guide/overview
- **Separate configs**: Each locale can have custom navigation/sidebar
- **Fallback support**: Missing translations fall back to default locale

**Implementation**:
```typescript
// .vitepress/config.ts
export default defineConfig({
  locales: {
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: { /* English nav/sidebar */ }
    },
    ja: {
      label: '日本語',
      lang: 'ja-JP',
      link: '/ja/',
      themeConfig: { /* Japanese nav/sidebar */ }
    }
  }
})
```

**Alternatives Rejected**:
- Custom plugin: Unnecessary complexity, reinventing built-in features
- Separate repos: Content drift risk, harder to keep in sync
- Git submodules: Over-engineered for documentation

**References**:
- https://vitepress.dev/guide/i18n
- https://github.com/vuejs/vitepress/tree/main/docs (VitePress own docs use this approach)

---

### 3. Documentation Structure Organization

**Question**: How should we organize the migrated documentation for best user experience?

**Options Evaluated**:
- Flat structure (all files in root)
- Numbered structure (01-overview.md style)
- Categorical structure (guide/, architecture/, reference/)
- Feature-based structure (setup/, api/, deployment/)

**Decision**: Three-tier categorical structure (guide/, architecture/, reference/)

**Rationale**:
- **User journey alignment**: Guide (onboarding) → Architecture (understanding) → Reference (deep dive)
- **Scalability**: Easy to add new pages within categories
- **Standard pattern**: Used by Vue.js, Nuxt, Vite official docs
- **Clear hierarchy**: Sidebar navigation naturally reflects structure
- **SEO-friendly**: URL paths are descriptive (e.g., /en/architecture/database)

**Mapping**:
```
docs/01-overview.md        → en/guide/overview.md
docs/02-system-design.md   → en/architecture/system-design.md
docs/03-implementation.md  → en/reference/implementation.md
docs/development-spec.md   → en/reference/development-spec.md
README.md                  → Link from homepage (not migrated)
CLAUDE.md                  → Link from homepage (not migrated)
```

**Category Definitions**:
- **guide/**: Getting started, setup, quickstart (for new users)
- **architecture/**: System design, database schema, data model (for understanding)
- **reference/**: API docs, implementation details, advanced topics (for deep work)

**Alternatives Rejected**:
- Flat structure: Poor UX as documentation grows, no clear organization
- Numbered structure: Inflexible, forces linear reading, hard to insert new content
- Feature-based: Too granular for initial content, premature optimization

**References**:
- https://vuejs.org/guide/ (Vue.js docs structure)
- https://vitejs.dev/guide/ (Vite docs structure)

---

### 4. Deployment Platform Integration

**Question**: How to integrate VitePress with Cloudflare Pages for automatic deployment?

**Options Evaluated**:
- Cloudflare Pages GitHub integration (auto-deploy)
- Manual wrangler pages deploy
- GitHub Actions → wrangler publish
- Vercel/Netlify (off-brand alternatives)

**Decision**: Cloudflare Pages GitHub integration (automatic deployment)

**Rationale**:
- **Zero configuration**: Connect GitHub repo, set build command, done
- **Preview deployments**: Every PR gets a preview URL automatically
- **Branch deployments**: main → production, other branches → staging
- **No CI/CD needed**: Built-in build process, no GitHub Actions required
- **Free tier sufficient**: Unlimited requests on Free plan
- **Brand alignment**: Same platform as Atrarium backend (Cloudflare Workers)

**Setup**:
1. Connect GitHub repo to Cloudflare Pages
2. Set build command: `npm run docs:build`
3. Set build output directory: `docs-site/.vitepress/dist`
4. Enable automatic deployments on main branch

**Alternatives Rejected**:
- Manual wrangler: Requires manual trigger, no preview deployments
- GitHub Actions: Unnecessary CI complexity, Pages handles it
- Vercel/Netlify: Off-brand, adds another platform to manage

**References**:
- https://developers.cloudflare.com/pages/framework-guides/deploy-a-vitepress-site/
- https://developers.cloudflare.com/pages/configuration/build-configuration/

---

### 5. Search Functionality

**Question**: What search solution provides the best developer experience?

**Options Evaluated**:
- VitePress built-in local search (Minisearch based)
- Algolia DocSearch (external service)
- Pagefind (static search)
- Custom search (e.g., Fuse.js)

**Decision**: VitePress built-in local search

**Rationale**:
- **Zero configuration**: Enabled by default, no API keys needed
- **Client-side**: Fast, works offline, no server dependency
- **Privacy-friendly**: No data sent to third parties
- **Instant results**: Index built at build time, searches in milliseconds
- **Locale-aware**: Automatically scopes search to current language
- **Maintenance-free**: Updates with VitePress, no service to manage

**Configuration**:
```typescript
// .vitepress/config.ts
export default defineConfig({
  themeConfig: {
    search: {
      provider: 'local' // Default, can be customized
    }
  }
})
```

**Alternatives Rejected**:
- Algolia DocSearch: Requires application approval, external dependency, overkill for small docs
- Pagefind: Additional build step, not integrated with VitePress
- Custom search: Reinventing the wheel, maintenance burden

**References**:
- https://vitepress.dev/reference/default-theme-search
- https://github.com/vuejs/vitepress/tree/main/src/client/theme-default/components/VPLocalSearchBox.vue

---

### 6. Theme and Customization

**Question**: Should we use the default VitePress theme or create a custom theme?

**Options Evaluated**:
- VitePress default theme (as-is)
- Default theme with minor CSS tweaks
- Custom theme (full control)
- Third-party theme

**Decision**: Default theme with minor brand customization

**Rationale**:
- **Production-ready**: Default theme is polished, accessible, responsive
- **Dark mode**: Built-in, respects system preference, toggle in navbar
- **Brand colors**: Can customize via CSS variables for Atrarium brand
- **Maintenance-free**: Updates automatically with VitePress
- **Focus on content**: Avoid theme development, focus on documentation quality

**Customization Plan**:
- Primary color: Atrarium brand color (via CSS variables)
- Logo: Atrarium logo in navbar
- Footer: Add Atrarium links/copyright
- Font: Use system fonts for performance (no web fonts)

**CSS Variables to Override**:
```css
/* .vitepress/theme/custom.css */
:root {
  --vp-c-brand: #3b82f6; /* Atrarium blue */
  --vp-c-brand-dark: #2563eb;
  --vp-c-brand-darker: #1d4ed8;
}
```

**Alternatives Rejected**:
- Custom theme: Overkill, would require ongoing maintenance
- Third-party theme: Dependency risk, may not fit Atrarium brand
- No customization: Missed opportunity for branding

**References**:
- https://vitepress.dev/guide/extending-default-theme
- https://vitepress.dev/reference/default-theme-config

---

### 7. Asset Management (Images, Diagrams)

**Question**: How to handle images and diagrams in documentation?

**Options Evaluated**:
- Store in docs-site/public/ (static assets)
- Store in docs-site/en/images/ (co-located)
- External CDN (e.g., Cloudflare Images)
- Git LFS for large images

**Decision**: Store in docs-site/public/images/

**Rationale**:
- **Standard VitePress pattern**: public/ folder is served at root
- **Build optimization**: Vite handles asset optimization
- **Absolute paths**: Reference as /images/diagram.png (works in all locales)
- **Simple deployment**: Assets bundled with site, no external dependencies
- **Version control**: Images tracked in Git (acceptable for documentation)

**Directory Structure**:
```
docs-site/public/
└── images/
    ├── architecture/
    │   ├── system-diagram.png
    │   └── database-schema.png
    └── guide/
        └── setup-screenshot.png
```

**Usage in Markdown**:
```markdown
![System Architecture](/images/architecture/system-diagram.png)
```

**Alternatives Rejected**:
- Co-located images: Complicates i18n (would need to duplicate for en/ and ja/)
- External CDN: Over-engineering, adds dependency
- Git LFS: Unnecessary for documentation images (typically small)

**References**:
- https://vitepress.dev/guide/asset-handling

---

## Summary of Decisions

| Decision Point | Choice | Key Reason |
|----------------|--------|-----------|
| Static Site Generator | VitePress | Native i18n, performance, Vue ecosystem |
| i18n Strategy | VitePress built-in locales | Zero dependencies, file-based |
| Documentation Structure | guide/architecture/reference | User journey alignment, scalability |
| Deployment | Cloudflare Pages (auto) | Zero config, preview deployments |
| Search | VitePress local search | Client-side, privacy-friendly, fast |
| Theme | Default + brand colors | Production-ready, maintenance-free |
| Assets | public/images/ | Standard pattern, build optimization |

## Next Steps

All research complete. Proceed to Phase 1 (Design & Contracts):
1. Create data-model.md (documentation page entities)
2. Create contracts/navigation.md (sidebar/nav structure)
3. Create contracts/i18n.md (locale parity requirements)
4. Create quickstart.md (developer quick reference)
5. Update CLAUDE.md (VitePress development context)
