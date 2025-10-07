# Feature Specification: Remove VitePress Hosting and Reorganize Documentation

**Feature Branch**: `012-vitepress-lexicons-server`
**Created**: 2025-10-07
**Status**: Draft
**Input**: User description: "vitepressのホスティングはあまり意味がなさそうなので削除。ドキュメント類はlexicons, server, clientなど対応するディレクトリ配下に整理して保存。"

## Execution Flow (main)
```
1. Parse user description from Input
   → Feature: Remove VitePress hosting, reorganize docs to component directories
2. Extract key concepts from description
   → Actors: Project maintainers, developers
   → Actions: Remove VitePress workspace, move documentation files, update references
   → Data: Documentation files (*.md), VitePress config, deployment configs
   → Constraints: Preserve documentation content, maintain accessibility
3. For each unclear aspect:
   → docs.atrarium.net deployment will be completely removed (Cloudflare Pages configuration)
   → Japanese translations (ja/) will be removed, keep English only
   → Cross-component references will use absolute paths from repo root (e.g., /server/docs/api.md)
4. Fill User Scenarios & Testing section
   → Developer accesses component-specific documentation locally
5. Generate Functional Requirements
   → Each requirement testable via file structure checks
6. Identify Key Entities
   → Documentation files, workspace configuration
7. Run Review Checklist
   → WARN "Spec has uncertainties" - clarifications needed
8. Return: SUCCESS (spec ready for planning)
```

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## Clarifications

### Session 2025-10-07
- Q: docs.atrarium.net deployment handling? → A: A (Complete removal including Cloudflare Pages configuration)
- Q: i18n documentation files (ja/) handling? → A: A (Keep English only, remove ja/ translations)
- Q: Cross-component documentation reference link format? → A: C (Absolute paths from repository root, e.g., /server/docs/api.md)
- Q: VitePress-specific assets (images, diagrams) handling? → A: A (Delete assets and remove image references from documentation)
- Q: Documentation placement granularity within component directories? → A: C (Multiple topic-based markdown files at component root, e.g., server/API.md, server/DEPLOYMENT.md)
- Q: Documentation consolidation approach? → A: Consolidate redundant/overlapping documentation during migration (not just move)

---

## User Scenarios & Testing

### Primary User Story
As a developer working on a specific component (lexicons, server, or client), I want to access relevant, consolidated documentation as topic-based markdown files directly at the component's root directory (e.g., server/API.md, server/ARCHITECTURE.md), so that I can find component-specific documentation without navigating to a separate documentation site, subdirectory, or multiple overlapping files.

### Acceptance Scenarios
1. **Given** VitePress workspace exists, **When** removal is executed, **Then** VitePress workspace is completely removed from pnpm workspaces
2. **Given** documentation exists in `docs/` directory, **When** reorganization is executed, **Then** documentation files are moved to respective component directories (lexicons/, server/, client/)
3. **Given** documentation has been reorganized, **When** developer navigates to component directory, **Then** topic-based markdown files are present at component root level (not in docs/ subdirectory)
4. **Given** documentation references exist in README.md, **When** reorganization is complete, **Then** references are updated to point to new locations

### Edge Cases
- What happens to VitePress-specific assets (images, diagrams)? (Delete assets and remove image references from documentation)
- How are cross-component documentation references updated? (Use absolute paths from repository root, e.g., /server/docs/api.md)
- What happens to i18n documentation files (en/, ja/)? (Keep English only, remove Japanese translations)
- How is the existing deployment at docs.atrarium.net handled? (Cloudflare Pages configuration will be completely removed)

## Requirements

### Functional Requirements
- **FR-001**: System MUST remove VitePress workspace from pnpm workspace configuration
- **FR-002**: System MUST remove VitePress-related package.json dependencies and scripts
- **FR-003**: System MUST move lexicon-related documentation to lexicons/ directory as topic-based markdown files at root level
- **FR-004**: System MUST move server-related documentation to server/ directory as topic-based markdown files at root level
- **FR-005**: System MUST move client-related documentation to client/ directory as topic-based markdown files at root level
- **FR-006**: System MUST consolidate redundant or overlapping documentation during migration while preserving essential content
- **FR-007**: System MUST update README.md references to reflect new documentation locations
- **FR-008**: System MUST update CLAUDE.md references to reflect new documentation structure
- **FR-009**: System MUST completely remove VitePress deployment at docs.atrarium.net including Cloudflare Pages configuration
- **FR-010**: System MUST keep English documentation only and remove Japanese translations (ja/ directories)
- **FR-011**: System MUST update cross-component documentation references to use absolute paths from repository root (e.g., /server/docs/api.md)
- **FR-012**: System MUST remove VitePress-specific assets (images, diagrams in .vitepress/ and public/ directories) and remove image references from documentation
- **FR-013**: System MUST place documentation as topic-based markdown files at component root level (e.g., server/API.md, client/DEPLOYMENT.md), not in docs/ subdirectories
- **FR-014**: System MUST identify and merge duplicate documentation sections across multiple files
- **FR-015**: System MUST remove outdated or VitePress-specific documentation that no longer applies

### Key Entities
- **VitePress Workspace**: The `docs/` directory containing VitePress configuration, documentation pages, and deployment settings
- **Component Documentation**: Markdown files specific to lexicons, server, or client components
- **Workspace Configuration**: pnpm-workspace.yaml and root package.json referencing the docs workspace
- **Documentation References**: Links in README.md, CLAUDE.md, and other files pointing to VitePress documentation

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous (excluding clarifications)
- [x] Success criteria are measurable (file structure checks)
- [x] Scope is clearly bounded (documentation reorganization only)
- [x] Dependencies and assumptions identified (VitePress deployment, i18n structure)

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed

---
