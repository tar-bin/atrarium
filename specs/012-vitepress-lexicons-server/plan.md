# Implementation Plan: Remove VitePress Hosting and Reorganize Documentation

**Branch**: `012-vitepress-lexicons-server` | **Date**: 2025-10-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-vitepress-lexicons-server/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded successfully
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All clarifications resolved in Session 2025-10-07
3. Fill the Constitution Check section based on the constitution
   → ✅ Completed below
4. Evaluate Constitution Check section
   → ✅ PASS - No violations
5. Execute Phase 0 → research.md
   → ✅ Created research.md with file mapping and decisions
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
   → ✅ Created data-model.md, contracts/migration-api.md, quickstart.md
7. Re-evaluate Constitution Check section
   → ✅ PASS - Design complies with all principles
8. Plan Phase 2 → Describe task generation approach
   → ✅ Described below (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
   → ✅ Complete
```

## Summary

**Feature**: Remove VitePress hosting and reorganize documentation from centralized `docs/` workspace to component directories (lexicons/, server/, client/).

**Primary Requirements**:
- Remove VitePress workspace from pnpm workspaces
- Migrate and consolidate English documentation to component root directories as topic-based markdown files
- Delete outdated implementation documentation (development-spec.md, implementation.md)
- Consolidate overlapping architecture and API documentation
- Remove Japanese translations and VitePress-specific assets
- Update workspace configuration (pnpm-workspace.yaml, package.json)
- Update documentation references in README.md and CLAUDE.md
- Delete docs.atrarium.net Cloudflare Pages deployment configuration

**Technical Approach** (from research.md and consolidation-strategy.md):
- File-based migration using TypeScript script (`scripts/migrate-vitepress-docs.ts`)
- Content transformation: Update links to absolute repo paths, remove image references
- Documentation consolidation: Merge overlapping files, delete outdated files (39% size reduction: 3,814 → 2,318 lines)
- Atomic operations: Consolidate → Migrate → Update config → Update references → Delete workspace
- Verification: Check file existence, link validity, workspace configuration, no information loss

## Technical Context

**Language/Version**: TypeScript 5.7 (Node.js 18+ via tsx)
**Primary Dependencies**: Node.js `fs/promises`, `path`, `tsx` (TypeScript executor)
**Storage**: Filesystem (markdown files, YAML/JSON configs)
**Testing**: Manual verification checklist (see quickstart.md)
**Target Platform**: Monorepo file structure (pnpm workspaces)
**Project Type**: Documentation reorganization (file operations, not code)
**Performance Goals**: Migration completes in <5 minutes
**Constraints**: No data loss (preserve all text content), no broken links after migration
**Scale/Scope**: ~14 documentation files, 3 workspace configs, 2 reference files

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Initial Constitution Check (Before Phase 0)

**Simplicity Principles** (Principle 2):
- ✅ No new projects (removes VitePress workspace, simplifies structure)
- ✅ No new databases (N/A - documentation only)
- ✅ No new services (N/A - documentation only)
- ✅ Minimal dependencies (uses Node.js built-ins, adds only `tsx` for execution)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (no changes to AT Protocol Lexicon schemas)
- ✅ Economic efficiency preserved (removes docs.atrarium.net hosting cost, neutral impact)
- ✅ No framework proliferation (removes VitePress, no replacement framework)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (no changes to data storage)
- ✅ Durable Objects usage unchanged (N/A - documentation only)
- ✅ No centralized user database created (N/A - documentation only)

**Operational Burden** (Principle 6):
- ✅ Reduces operational burden (no VitePress site to maintain, no i18n sync required)
- ✅ No manual server maintenance (N/A - documentation only)
- ✅ Simplifies documentation maintenance (component-specific docs easier to find)

**Conclusion**: ✅ PASS - Feature complies with all constitution principles

---

### Post-Design Constitution Check (After Phase 1)

**Simplicity Validation**:
- ✅ Migration script is single-purpose (`scripts/migrate-vitepress-docs.ts`)
- ✅ No new runtime dependencies (tsx is devDependency, used for migration only)
- ✅ Removes 1 workspace (docs/), adds 0 new workspaces

**Protocol-First Validation**:
- ✅ No changes to `lexicons/*.json` Lexicon schemas
- ✅ Documentation reorganization does not affect AT Protocol compatibility

**Economic Efficiency Validation**:
- ✅ Removes Cloudflare Pages deployment (cost-neutral or cost-saving)
- ✅ No new infrastructure introduced

**PDS-First Validation**:
- ✅ No changes to data flow or storage architecture
- ✅ Documentation changes do not affect PDS-first principles

**Operational Burden Validation**:
- ✅ Reduces burden: No VitePress build/deploy, no i18n sync, no separate docs site
- ✅ Documentation maintenance simplified (co-located with components)

**Conclusion**: ✅ PASS - Design complies with all constitution principles. No violations detected.

---

## Project Structure

### Documentation (this feature)

```
specs/012-vitepress-lexicons-server/
├── spec.md              # Feature specification
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output - file mapping decisions
├── data-model.md        # Phase 1 output - file system entities
├── quickstart.md        # Phase 1 output - step-by-step migration guide
├── contracts/           # Phase 1 output - migration API contracts
│   └── migration-api.md # File operation contracts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

**Current Structure** (before migration):
```
/workspaces/atrarium/
├── docs/                     # VitePress workspace (TO BE DELETED)
│   ├── .vitepress/           # VitePress config, theme, locales
│   ├── architecture/         # System design docs
│   │   ├── api.md
│   │   ├── database.md
│   │   └── system-design.md
│   ├── guide/                # Getting started docs
│   │   ├── concept.md
│   │   ├── quickstart.md
│   │   └── setup.md
│   ├── reference/            # API reference docs
│   │   ├── api-reference.md
│   │   ├── implementation.md
│   │   └── moderation-reasons.md
│   ├── CONTRIBUTING.md
│   ├── DEPLOYMENT.md
│   ├── index.md              # VitePress homepage
│   └── README.md             # VitePress meta
├── lexicons/                 # Lexicon schemas
│   └── README.md             # Already exists (no changes)
├── server/                   # Backend server
│   ├── src/
│   └── tests/
├── client/                   # Web dashboard
│   ├── src/
│   └── tests/
├── pnpm-workspace.yaml       # Contains 'docs' (TO BE UPDATED)
├── package.json              # Contains test:docs script (TO BE UPDATED)
├── README.md                 # Links to docs.atrarium.net (TO BE UPDATED)
└── CLAUDE.md                 # References VitePress docs (TO BE UPDATED)
```

**Target Structure** (after migration):
```
/workspaces/atrarium/
├── lexicons/
│   └── README.md             # (unchanged)
├── server/
│   ├── src/
│   ├── tests/
│   ├── API.md                # ← docs/architecture/api.md
│   ├── DATABASE.md           # ← docs/architecture/database.md
│   ├── ARCHITECTURE.md       # ← docs/architecture/system-design.md
│   ├── API_REFERENCE.md      # ← docs/reference/api-reference.md
│   ├── IMPLEMENTATION.md     # ← docs/reference/implementation.md
│   ├── MODERATION.md         # ← docs/reference/moderation-reasons.md
│   └── DEPLOYMENT.md         # ← docs/DEPLOYMENT.md
├── client/
│   ├── src/
│   └── tests/
├── CONCEPT.md                # ← docs/guide/concept.md
├── CONTRIBUTING.md           # ← docs/CONTRIBUTING.md
├── QUICKSTART.md             # ← docs/guide/quickstart.md
├── SETUP.md                  # ← docs/guide/setup.md
├── scripts/
│   └── migrate-vitepress-docs.ts  # New migration script
├── pnpm-workspace.yaml       # 'docs' removed
├── package.json              # test:docs script removed
├── README.md                 # VitePress links updated
└── CLAUDE.md                 # Documentation structure updated
```

**Structure Decision**: Monorepo with component-specific documentation at root level (not in subdirectories). VitePress workspace removed entirely. Documentation files placed as topic-based markdown files at component root (e.g., `server/API.md`, not `server/docs/api.md`).

**Rationale**:
- Component-specific docs co-located with code (easier to discover)
- Topic-based filenames (e.g., API.md, DATABASE.md) clear and self-explanatory
- No nested `docs/` subdirectories (reduces navigation depth)
- Project-level docs (CONCEPT.md, CONTRIBUTING.md) in repository root

---

## Phase 0: Outline & Research

**Status**: ✅ Complete ([research.md](research.md))

### Research Summary

**Current State Analyzed**:
1. VitePress workspace structure identified (~14 English docs, 10 Japanese docs)
2. Component directories surveyed (lexicons/, server/, client/)
3. Workspace configuration reviewed (pnpm-workspace.yaml, package.json)
4. Documentation references identified (README.md, CLAUDE.md)

**Decisions Made**:
1. **Migration Strategy**: Topic-based markdown files at component root (Clarification Q5)
2. **Link Format**: Absolute paths from repository root (Clarification Q3)
3. **i18n Handling**: English only, remove Japanese translations (Clarification Q2)
4. **Asset Handling**: Delete all images and VitePress-specific assets (Clarification Q4)
5. **Deployment Handling**: Complete removal of docs.atrarium.net (Clarification Q1)
6. **Workspace Cleanup**: Remove VitePress from pnpm workspaces

**File Mapping Table** (from research.md):
| Source | Destination | Type |
|--------|-------------|------|
| `docs/architecture/api.md` | `server/API.md` | Server docs |
| `docs/architecture/database.md` | `server/DATABASE.md` | Server docs |
| `docs/architecture/system-design.md` | `server/ARCHITECTURE.md` | Server docs |
| `docs/reference/api-reference.md` | `server/API_REFERENCE.md` | Server docs |
| `docs/reference/implementation.md` | `server/IMPLEMENTATION.md` | Server docs |
| `docs/reference/moderation-reasons.md` | `server/MODERATION.md` | Server docs |
| `docs/guide/concept.md` | `CONCEPT.md` (root) | Project-level |
| `docs/CONTRIBUTING.md` | `CONTRIBUTING.md` (root) | Project-level |
| `docs/guide/quickstart.md` | `QUICKSTART.md` (root) | Multi-component |
| `docs/guide/setup.md` | `SETUP.md` (root) | Multi-component |
| `docs/DEPLOYMENT.md` | `server/DEPLOYMENT.md` | Deployment |
| `docs/index.md` | DELETE | VitePress homepage |
| `docs/README.md` | DELETE | VitePress meta |
| `docs/.vitepress/` | DELETE | VitePress config |
| `docs/ja/` | DELETE | Japanese translations |

**Alternatives Considered**:
- Keep VitePress with component subdirectories: Rejected (violates Principle 2: Simplicity)
- Single root `docs/` directory: Rejected (Clarification Q5: component root placement)
- Preserve Japanese translations: Rejected (Clarification Q2: English only)

**Constitution Compliance**: ✅ All 6 principles satisfied (see research.md Section: Constitution Compliance Check)

---

## Phase 1: Design & Contracts

**Status**: ✅ Complete ([data-model.md](data-model.md), [contracts/migration-api.md](contracts/migration-api.md), [quickstart.md](quickstart.md))

### 1. Data Model ([data-model.md](data-model.md))

**File System Entities Defined**:
1. **VitePress Workspace**: Directory to be deleted (`docs/`)
2. **Documentation File**: Markdown file to be migrated (source → destination)
3. **Workspace Configuration**: Config files to be modified (pnpm-workspace.yaml, package.json)
4. **Documentation Reference**: Links to VitePress docs (README.md, CLAUDE.md)

**File Operation Contracts**:
- `migrate_documentation_file(source, dest)`: Read, transform, write
- `update_workspace_config(type)`: Remove VitePress references
- `delete_vitepress_workspace()`: Recursive directory deletion
- `update_documentation_references(file)`: Replace VitePress URLs

**State Transitions** (Migration Workflow):
```
[Analysis] → [Transformation] → [Migration] → [Configuration Update]
→ [Reference Update] → [Verification] → [Workspace Deletion] → [Cleanup]
```

**Validation Rules**:
- Pre-Migration: docs/ exists, VitePress config exists, component dirs exist
- Post-Migration: All files created, docs/ deleted, no VitePress URLs, workspace valid
- Content Integrity: No data loss, no images, links functional

### 2. API Contracts ([contracts/migration-api.md](contracts/migration-api.md))

**File Operations API Defined**:
1. `analyzeDocumentationStructure()`: Scan docs/ directory
2. `transformDocumentationContent()`: Update links, remove images
3. `migrateDocumentationFile()`: Read, transform, write
4. `updateWorkspaceConfiguration()`: Update YAML/JSON configs
5. `updateDocumentationReferences()`: Replace VitePress URLs
6. `deleteVitepressWorkspace()`: Delete docs/ directory
7. `verifyMigrationCompleteness()`: Check all validations

**CLI Script Interface**:
```bash
npm run migrate-docs -- --dry-run    # Preview changes
npm run migrate-docs                 # Execute migration
npm run migrate-docs -- --force      # Execute + delete docs/
npm run migrate-docs -- --verify-only # Verification only
```

**Error Handling**:
- Destination file exists → Abort with error
- VitePress URLs remain → Verification failure
- Broken links → List and suggest manual fix

### 3. Quickstart Guide ([quickstart.md](quickstart.md))

**Step-by-Step Migration Process** (8 steps, 50 minutes):
1. **Pre-Migration Analysis** (5 min): Verify structure, count files
2. **Create Migration Script** (10 min): Write TypeScript migration script
3. **Dry-Run Migration** (5 min): Preview changes without modification
4. **Execute Migration** (10 min): Migrate files, update configs
5. **Manual Adjustments** (10 min): Handle multi-component docs, update CLAUDE.md
6. **Delete Workspace** (5 min): Remove docs/ directory
7. **Verification** (5 min): Build, link check, git status review
8. **Commit Changes** (2 min): Stage and commit

**Success Criteria**:
- Functional: docs/ deleted, component docs exist, workspace valid
- Content: Text preserved, no VitePress URLs, links functional
- Workspace: No broken links, build succeeds, pnpm install succeeds

**Rollback Procedures**:
- Git reset (before commit), git revert (after commit), restore from backup

### 4. Agent Context Update

**IMPORTANT**: Agent context update deferred until after all design artifacts complete (per template step 5).

---

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

### Task Generation Strategy

**Source Artifacts**:
- [research.md](research.md): File mapping table, decisions
- [data-model.md](data-model.md): File operation contracts
- [contracts/migration-api.md](contracts/migration-api.md): API specifications
- [quickstart.md](quickstart.md): Step-by-step procedure

**Task Categories**:
1. **Preparation Tasks**:
   - Create migration script directory
   - Install tsx dependency
   - Add npm script to package.json

2. **Migration Script Tasks**:
   - Implement file analysis function
   - Implement content transformation function
   - Implement file migration function
   - Implement workspace config update function
   - Implement reference update function
   - Implement deletion function
   - Implement verification function
   - Add CLI argument parsing (--dry-run, --force, --verify-only)

3. **Verification Tasks**:
   - Create pre-migration checklist
   - Create post-migration checklist
   - Test dry-run mode
   - Test migration execution
   - Test verification mode

4. **Documentation Tasks**:
   - Update README.md (replace VitePress links)
   - Update CLAUDE.md (document new structure)
   - Handle multi-component docs (QUICKSTART.md, SETUP.md)
   - Verify no broken links

5. **Cleanup Tasks**:
   - Delete VitePress workspace
   - Run pnpm install
   - Verify workspace validity
   - Commit changes

**Ordering Strategy**:
- **Sequential**: Preparation → Script Implementation → Verification → Documentation → Cleanup
- **Parallel opportunities** [P]:
  - Script implementation tasks (independent functions)
  - Verification checklist tasks (can be written in parallel)
  - Documentation update tasks (independent files)

**Estimated Task Count**: 20-25 numbered tasks

**Task Format** (from tasks-template.md):
```markdown
## Task N: [Task Title] [P]
**Category**: [Preparation|Implementation|Verification|Documentation|Cleanup]
**Depends On**: [Task M] or None
**Estimated Time**: [5-15 minutes]

### Description
[What to do]

### Acceptance Criteria
- [ ] [Specific, testable criterion]
```

**Dependency Examples**:
- Task "Implement content transformation" → No dependencies [P]
- Task "Test dry-run mode" → Depends on "Implement CLI argument parsing"
- Task "Delete VitePress workspace" → Depends on "Verify no broken links"

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

---

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run quickstart.md, execute verification checklist)

---

## Complexity Tracking

*This section is EMPTY because Constitution Check has NO violations*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| (none) | N/A | N/A |

**Rationale**: This feature removes complexity (VitePress workspace) without adding any new projects, databases, or services. It fully complies with Principle 2 (Simplicity and Minimal Complexity).

---

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
- [x] All NEEDS CLARIFICATION resolved (Session 2025-10-07)
- [x] Complexity deviations documented (none)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] consolidation-strategy.md (Phase 0 - documentation consolidation analysis)
- [x] data-model.md (Phase 1)
- [x] contracts/migration-api.md (Phase 1)
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)
- [ ] tasks.md (Phase 2 - /tasks command)

---

**Next Command**: `/tasks` (to generate tasks.md from this plan)

---

*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
