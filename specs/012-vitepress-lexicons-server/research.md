# Research: Remove VitePress Hosting and Reorganize Documentation

**Feature**: 012-vitepress-lexicons-server
**Date**: 2025-10-07

## Current State Analysis

### VitePress Workspace Structure
**Location**: `/workspaces/atrarium/docs/`

**Key Directories**:
- `.vitepress/`: Configuration (config.ts, locales/, theme/)
- `architecture/`: System design docs (api.md, database.md, system-design.md)
- `guide/`: Getting started docs (concept.md, quickstart.md, setup.md)
- `reference/`: API reference docs (api-reference.md, development-spec.md, implementation.md, moderation-reasons.md)
- `CONTRIBUTING.md`, `DEPLOYMENT.md`, `README.md`, `index.md`

**pnpm Workspace Configuration**:
- Listed in `pnpm-workspace.yaml` as `'docs'`
- Root `package.json` includes `test:docs` script

**Deployment**:
- Hosted at https://docs.atrarium.net (Cloudflare Pages)
- VitePress build output in `.vitepress/dist/`

**i18n Structure**:
- English docs in `docs/en/` (10 pages)
- Japanese docs in `docs/ja/` (10 pages, mirrors en/)

### Component Directory Structure
**Current State**:
- `lexicons/`: Contains `*.json` lexicon schemas + `README.md`
- `server/`: Contains `src/`, `tests/`, `package.json`, `wrangler.toml`, `tsconfig.json`
- `client/`: Contains `src/`, `tests/`, `package.json`, `vite.config.ts`, `tsconfig.json`

**Existing Component Documentation**:
- `lexicons/README.md` (already exists, explains AT Protocol Lexicon schemas)
- `server/README.md` (need to check if exists)
- `client/README.md` (need to check if exists)

### Documentation References
**Files Referencing VitePress Docs**:
- `README.md` (root): Links to https://docs.atrarium.net
- `CLAUDE.md`: References VitePress documentation structure
- Component READMEs may link to VitePress pages

## Decisions

### Decision 1: Documentation Migration Strategy
**Decision**: Move documentation as topic-based markdown files to component root directories

**Rationale**:
- Clarification Q5: Place docs at component root (e.g., `server/API.md`, `client/DEPLOYMENT.md`)
- Avoids nested `docs/` subdirectories for better discoverability
- Aligns with monorepo best practices (component-specific docs co-located with code)

**Implementation**:
- `docs/architecture/api.md` → `server/API.md`
- `docs/architecture/database.md` → `server/DATABASE.md`
- `docs/architecture/system-design.md` → `server/ARCHITECTURE.md`
- `docs/reference/api-reference.md` → `server/API_REFERENCE.md`
- `docs/reference/implementation.md` → `server/IMPLEMENTATION.md`
- `docs/reference/moderation-reasons.md` → `server/MODERATION.md`
- `docs/guide/quickstart.md` → Root or multi-component (needs analysis)
- `docs/guide/setup.md` → Root or multi-component (needs analysis)
- `docs/guide/concept.md` → Root `CONCEPT.md` (project-level overview)
- `docs/DEPLOYMENT.md` → Root or `server/DEPLOYMENT.md` (needs analysis)
- `docs/CONTRIBUTING.md` → Root `CONTRIBUTING.md` (project-level)
- `lexicons/README.md` → Keep as-is (already in correct location)

### Decision 2: Link Format for Cross-Component References
**Decision**: Use absolute paths from repository root (e.g., `/server/API.md`)

**Rationale**:
- Clarification Q3: Absolute paths from repo root for consistency
- GitHub/GitLab/VS Code resolve repo-root paths correctly
- Avoids fragile relative paths like `../../server/API.md`

**Implementation**:
- Update all internal doc links to format: `[link text](/component/FILE.md)`
- Example: `[Server API](/server/API.md)`, `[Lexicons](/lexicons/README.md)`

### Decision 3: i18n Handling
**Decision**: Keep English documentation only, remove Japanese translations

**Rationale**:
- Clarification Q2: English only to reduce maintenance burden
- VitePress i18n infrastructure (locales/, routing) no longer needed
- Future translations can be added manually per-component if needed

**Implementation**:
- Extract English docs from `docs/en/` directory structure
- Delete `docs/ja/` entirely
- Remove i18n config from `.vitepress/config.ts`

### Decision 4: VitePress-Specific Assets
**Decision**: Delete all images, diagrams, and VitePress-specific assets

**Rationale**:
- Clarification Q4: Delete assets and remove references
- VitePress-specific image paths (`/images/...`) won't work in plain markdown
- Simplifies migration (no asset path rewriting needed)

**Implementation**:
- Delete `.vitepress/public/` directory (if exists)
- Search for image references (`![...](...)`), remove from docs
- Delete `.vitepress/theme/` custom styling

### Decision 5: Cloudflare Pages Deployment
**Decision**: Completely remove deployment configuration

**Rationale**:
- Clarification Q1: Complete removal including Cloudflare Pages
- docs.atrarium.net will no longer serve VitePress site
- Cloudflare Pages project deletion (manual step, not in codebase)

**Implementation**:
- Remove `docs/` workspace from `pnpm-workspace.yaml`
- Remove `test:docs` script from root `package.json`
- Delete entire `docs/` directory
- Update README.md to remove VitePress documentation links
- Add note in README.md: "Component documentation is located in respective directories"

### Decision 6: Workspace Configuration Cleanup
**Decision**: Remove VitePress workspace cleanly from pnpm

**Rationale**:
- `pnpm-workspace.yaml` lists `'docs'` as workspace
- Root `package.json` has `test:docs` script
- Clean removal prevents pnpm errors

**Implementation**:
- Edit `pnpm-workspace.yaml`: Remove `'docs'` line
- Edit root `package.json`: Remove `test:docs` script
- Run `pnpm install` to refresh workspace links

## Alternatives Considered

### Alternative 1: Keep VitePress, Move to Component Subdirectories
**Rejected**: Would maintain VitePress complexity while splitting docs. Violates Principle 2 (Simplicity).

### Alternative 2: Single Root `docs/` Directory (Not VitePress)
**Rejected**: Clarification Q5 specified component root placement, not centralized docs directory.

### Alternative 3: Preserve Japanese Translations
**Rejected**: Clarification Q2 specified English only. Reduces maintenance burden (no i18n sync required).

### Alternative 4: Redirect docs.atrarium.net to GitHub
**Rejected**: Clarification Q1 specified complete removal. Avoids maintaining redirect infrastructure.

## Implementation Notes

### File Mapping Table
| Source (VitePress) | Destination | Type |
|--------------------|-------------|------|
| `docs/architecture/api.md` | `server/API.md` | Server docs |
| `docs/architecture/database.md` | `server/DATABASE.md` | Server docs |
| `docs/architecture/system-design.md` | `server/ARCHITECTURE.md` | Server docs |
| `docs/reference/api-reference.md` | `server/API_REFERENCE.md` | Server docs |
| `docs/reference/implementation.md` | `server/IMPLEMENTATION.md` | Server docs |
| `docs/reference/moderation-reasons.md` | `server/MODERATION.md` | Server docs |
| `docs/guide/concept.md` | `CONCEPT.md` (root) | Project-level |
| `docs/CONTRIBUTING.md` | `CONTRIBUTING.md` (root) | Project-level |
| `docs/guide/quickstart.md` | TBD (multi-component) | Multi-component |
| `docs/guide/setup.md` | TBD (multi-component) | Multi-component |
| `docs/DEPLOYMENT.md` | TBD (server or root) | Deployment |
| `docs/index.md` | DELETE (VitePress homepage) | VitePress-specific |
| `docs/README.md` | DELETE (VitePress meta) | VitePress-specific |
| `docs/.vitepress/` | DELETE | VitePress-specific |
| `docs/ja/` | DELETE | Japanese translations |

**Multi-Component Docs Strategy**:
- `quickstart.md`: Split into component-specific quickstart sections or keep at root
- `setup.md`: Split into component setup guides (e.g., `server/SETUP.md`, `client/SETUP.md`)
- `DEPLOYMENT.md`: Move to `server/DEPLOYMENT.md` (server-specific deployment)

### Link Update Strategy
1. **Search for VitePress doc links**:
   - `grep -r "docs.atrarium.net" .` (external links)
   - `grep -r "\[.*\](.*\.md)" .` (internal markdown links)
2. **Update patterns**:
   - `https://docs.atrarium.net/en/guide/concept.html` → `/CONCEPT.md`
   - `docs/architecture/api.md` → `/server/API.md`
   - `[API Reference](https://docs.atrarium.net/...)` → `[API Reference](/server/API_REFERENCE.md)`

### Image Reference Cleanup
1. **Search for image references**: `grep -r "!\[.*\](.*\.(png|jpg|svg))" docs/`
2. **Remove image markdown**: Delete `![alt](path)` lines
3. **Delete asset directories**: `.vitepress/public/`, `docs/images/` (if exists)

## Constitution Compliance Check

### Principle 1: Protocol-First Architecture
✅ **PASS** - Documentation reorganization does not affect AT Protocol Lexicon schemas.

### Principle 2: Simplicity and Minimal Complexity
✅ **PASS** - Removes VitePress workspace, reduces dependencies, simplifies documentation structure.

### Principle 3: Economic Efficiency
✅ **PASS** - No infrastructure cost changes (docs.atrarium.net deployment removal is cost-neutral).

### Principle 4: Decentralized Identity and Data Ownership
✅ **PASS** - Documentation changes do not affect user data storage or PDS architecture.

### Principle 5: PDS-First Architecture
✅ **PASS** - No changes to data flow or storage architecture.

### Principle 6: Operational Burden Reduction
✅ **PASS** - Reduces operational burden (no VitePress site to maintain, no i18n sync required).

**Conclusion**: ✅ All constitution principles satisfied. No violations or exceptions needed.

## Risk Analysis

### Risk 1: Broken Links During Migration
**Mitigation**: Systematic link update strategy with grep-based search before deletion.

### Risk 2: Loss of VitePress-Specific Features
**Impact**: Search, sidebar navigation, theme no longer available.
**Mitigation**: Component-specific docs are self-contained, GitHub provides basic markdown rendering.

### Risk 3: Documentation Discoverability
**Impact**: Developers must navigate component directories instead of centralized site.
**Mitigation**: Update root README.md with clear documentation index pointing to component docs.

### Risk 4: External Links to docs.atrarium.net
**Impact**: External sites (blogs, social media) linking to old VitePress docs will 404.
**Mitigation**: Acceptable per clarification Q1 (complete removal). No redirect infrastructure.

## Next Steps (Phase 1)

1. **Create data model**: File migration mapping (source → destination)
2. **Define contracts**: File operation scripts (copy, update links, cleanup)
3. **Generate quickstart**: Step-by-step migration verification checklist
4. **Update agent context**: Document new documentation structure in CLAUDE.md
