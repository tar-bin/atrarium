# Implementation Plan: VitePress Documentation Site

**Branch**: `002-vitepress-docs` | **Date**: 2025-10-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/002-vitepress-docs/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec loaded successfully
2. Fill Technical Context ✅
   → Project Type: Documentation site (static content generation)
   → Structure Decision: Documentation project with source reorganization
3. Fill the Constitution Check section ✅
   → Atrarium project follows TypeScript/testing best practices
4. Evaluate Constitution Check section ✅
   → No violations: Documentation site follows project standards
5. Execute Phase 0 → research.md ✅
   → VitePress best practices research completed
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md ✅
   → Documentation structure and navigation contracts defined
7. Re-evaluate Constitution Check section ✅
   → Design complies with project standards
8. Plan Phase 2 → Task generation approach described ✅
9. STOP - Ready for /tasks command ✅
```

## Summary
Build a VitePress documentation site to replace the existing docs/ markdown files with a well-organized, searchable documentation portal. The site will support English and Japanese content, deploy automatically to Cloudflare Pages, and provide excellent developer experience with features like search, navigation, dark mode, and code highlighting.

## Technical Context
**Language/Version**: Node.js 18+, VitePress 1.x (Vue 3 based SSG)
**Primary Dependencies**: VitePress, Vue 3, vite-plugin-i18n (for localization)
**Storage**: Static markdown files (en/, ja/ directories)
**Testing**: VitePress build validation, link checking, i18n completeness tests
**Target Platform**: Cloudflare Pages (static site hosting)
**Project Type**: Documentation site (static content generation)
**Performance Goals**: Fast page load (leveraging VitePress SSG optimizations), instant navigation via SPA routing
**Constraints**: Support mobile/tablet/desktop, maintain existing documentation content
**Scale/Scope**: ~5 main documentation files initially, expandable structure for future content

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Atrarium Project Standards** (based on existing codebase):
- ✅ **TypeScript First**: VitePress config and custom components use TypeScript
- ✅ **Testing**: Build validation tests, link checker tests
- ✅ **Documentation**: This feature improves project documentation infrastructure
- ✅ **No Implementation Details in Spec**: Spec focuses on user needs, plan contains technical approach
- ✅ **Maintainability**: Standard VitePress structure, well-documented configuration

**Compliance Status**: PASS - No constitutional violations

## Project Structure

### Documentation (this feature)
```
specs/002-vitepress-docs/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
│   ├── navigation.md    # Navigation structure contract
│   └── i18n.md          # Localization contract
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
docs-site/               # VitePress documentation site (NEW)
├── .vitepress/
│   ├── config.ts        # VitePress configuration (i18n, theme, nav)
│   ├── theme/           # Custom theme components
│   │   └── index.ts
│   └── locales/         # Locale-specific config
│       ├── en.ts
│       └── ja.ts
├── en/                  # English documentation
│   ├── index.md         # Homepage
│   ├── guide/           # Getting started guides
│   │   ├── overview.md
│   │   ├── setup.md
│   │   └── quickstart.md
│   ├── architecture/    # System design docs
│   │   ├── system-design.md
│   │   ├── database.md
│   │   └── api.md
│   └── reference/       # API reference and advanced topics
│       ├── api-reference.md
│       └── implementation.md
├── ja/                  # Japanese documentation (mirrors en/)
│   ├── index.md
│   ├── guide/
│   ├── architecture/
│   └── reference/
├── public/              # Static assets (images, diagrams)
│   └── images/
└── package.json         # VitePress dependencies

docs/                    # Existing docs (will be migrated)
├── 01-overview.md       → docs-site/en/guide/overview.md + ja/guide/overview.md
├── 02-system-design.md  → docs-site/en/architecture/system-design.md + ja/
├── 03-implementation.md → docs-site/en/reference/implementation.md + ja/
└── development-spec.md  → docs-site/en/reference/development-spec.md + ja/

.github/
└── workflows/
    └── deploy-docs.yml  # Cloudflare Pages deployment (optional, Pages auto-deploys)
```

**Structure Decision**: Documentation project with reorganized content structure for better UX. Original docs/ files will be migrated to docs-site/en/ and docs-site/ja/ with improved organization (guide/, architecture/, reference/).

## Phase 0: Outline & Research

### Research Tasks Completed
1. **VitePress Configuration for i18n**
   - Decision: Use VitePress built-in i18n support with `locales` config
   - Rationale: Native support, no additional dependencies, excellent DX
   - Alternatives: Custom i18n plugin (more complex, not needed)

2. **Documentation Structure Best Practices**
   - Decision: Three-tier structure (Guide/Architecture/Reference)
   - Rationale: Standard documentation pattern, clear information hierarchy
   - Alternatives: Flat structure (poor scalability), custom categories (overcomplicated)

3. **Cloudflare Pages Integration**
   - Decision: Use automatic GitHub integration (no manual config)
   - Rationale: Zero-config deployment, preview environments for PRs
   - Alternatives: Manual wrangler deploy (requires maintenance), GitHub Actions (extra complexity)

4. **Search Implementation**
   - Decision: Use VitePress default local search (built-in)
   - Rationale: Zero-config, fast client-side search, works offline
   - Alternatives: Algolia DocSearch (requires approval, external dependency)

**Output**: research.md with all technical decisions documented

## Phase 1: Design & Contracts

### 1. Data Model (data-model.md)

**Entity: Documentation Page**
- path: string (e.g., "/en/guide/overview")
- title: string (extracted from frontmatter or h1)
- description: string (for SEO meta)
- locale: "en" | "ja"
- category: "guide" | "architecture" | "reference"
- order: number (for sidebar ordering)
- lastModified: timestamp (Git-based)

**Entity: Navigation Structure**
- sidebar: SidebarConfig (hierarchical menu)
- navbar: NavItem[] (top navigation)
- localeSwitcher: LocaleConfig (language selector)

**Entity: i18n Configuration**
- defaultLocale: "en"
- locales: { en: {...}, ja: {...} }
- fallbackLocale: "en"

### 2. API Contracts (contracts/)

**Navigation Contract (contracts/navigation.md)**:
```yaml
# Sidebar structure for each locale
sidebar:
  - text: "Guide"
    items:
      - text: "Overview"
        link: "/guide/overview"
      - text: "Setup"
        link: "/guide/setup"
  - text: "Architecture"
    items:
      - text: "System Design"
        link: "/architecture/system-design"
      - text: "Database"
        link: "/architecture/database"

# Top navigation
nav:
  - text: "Guide"
    link: "/guide/overview"
  - text: "Architecture"
    link: "/architecture/system-design"
  - text: "GitHub"
    link: "https://github.com/tar-bin/atrarium"
```

**i18n Contract (contracts/i18n.md)**:
```yaml
# Language configuration
locales:
  en:
    label: "English"
    lang: "en-US"
    link: "/en/"
  ja:
    label: "日本語"
    lang: "ja-JP"
    link: "/ja/"

# Content parity requirement
- All en/ pages MUST have corresponding ja/ pages
- File paths MUST mirror exactly (en/guide/overview.md ↔ ja/guide/overview.md)
- Navigation structure MUST be identical across locales
```

### 3. Contract Tests
```
tests/docs-site/
├── navigation.test.ts      # Validates sidebar/nav structure
├── i18n.test.ts            # Validates locale parity (all en/ pages have ja/)
├── links.test.ts           # Validates all internal links resolve
└── build.test.ts           # Validates VitePress build succeeds
```

### 4. Test Scenarios from User Stories

**Scenario 1: New Developer Discovers Documentation**
- Visit documentation site root
- Assert: Homepage displays with clear navigation menu
- Assert: Sidebar shows Guide/Architecture/Reference sections
- Assert: Language switcher present (EN/JA)

**Scenario 2: Developer Navigates Between Docs**
- Navigate to System Design page
- Click "Database" link in sidebar
- Assert: Database page loads with correct breadcrumb
- Assert: "Previous/Next" navigation present

**Scenario 3: Developer Searches Documentation**
- Enter "Cloudflare Workers" in search
- Assert: Relevant results from multiple pages
- Assert: Results highlight matched terms

**Scenario 4: Contributor Updates Documentation**
- Edit docs-site/en/guide/overview.md
- Commit to main branch
- Assert: Cloudflare Pages triggers rebuild
- Assert: Changes visible on production site within 2 minutes

### 5. Quickstart (quickstart.md)
```bash
# Install VitePress
cd docs-site
npm install

# Start dev server
npm run docs:dev
# Visit http://localhost:5173

# Add new documentation page
# 1. Create en/new-page.md
# 2. Create ja/new-page.md (Japanese translation)
# 3. Add to sidebar in .vitepress/config.ts

# Build for production
npm run docs:build

# Preview production build
npm run docs:preview
```

### 6. Update CLAUDE.md
Agent context update will be executed via script at the end of Phase 1.

**Output**: data-model.md, contracts/navigation.md, contracts/i18n.md, failing contract tests, quickstart.md, CLAUDE.md update

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Initialize VitePress project structure
- Migrate existing docs with reorganization
- Configure i18n (English + Japanese)
- Set up navigation and sidebar
- Configure Cloudflare Pages deployment
- Create initial Japanese translations
- Implement contract tests

**Task Ordering**:
1. [P] Initialize VitePress project (docs-site/ structure)
2. [P] Configure VitePress base settings (.vitepress/config.ts)
3. Configure i18n locales (en, ja)
4. Migrate docs/01-overview.md → en/guide/overview.md
5. Migrate docs/02-system-design.md → en/architecture/system-design.md
6. Migrate docs/03-implementation.md → en/reference/implementation.md
7. Migrate docs/development-spec.md → en/reference/development-spec.md
8. [P] Create Japanese translations (ja/ directory structure)
9. Configure sidebar navigation (.vitepress/config.ts)
10. Configure top navigation bar
11. Set up search (default local search)
12. Configure theme (dark/light mode)
13. Add "Edit this page" GitHub links
14. [P] Write navigation contract test
15. [P] Write i18n parity test
16. [P] Write link validation test
17. [P] Write build validation test
18. Configure Cloudflare Pages (wrangler.toml or Pages dashboard)
19. Test deployment workflow
20. Update CLAUDE.md with VitePress documentation

**Ordering Strategy**:
- Foundation first (VitePress init, config)
- Content migration before i18n (establish English baseline)
- i18n after English content (translate in batch)
- Tests parallel with implementation [P]
- Deployment last (after content and tests)

**Estimated Output**: 20-25 numbered, ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following project standards)
**Phase 5**: Validation (run tests, verify deployment, check i18n parity, validate navigation)

## Complexity Tracking
*No constitutional violations - table not needed*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved (via /clarify)
- [x] Complexity deviations documented (N/A - no violations)

---
*Based on Atrarium project standards - TypeScript, Testing, Documentation quality*
