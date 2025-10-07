# Tasks: Remove VitePress Hosting and Reorganize Documentation

**Input**: Design documents from `/workspaces/atrarium/specs/012-vitepress-lexicons-server/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/migration-api.md, consolidation-strategy.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Tech stack: TypeScript 5.7, Node.js fs/promises, tsx
   → Structure: Monorepo (pnpm workspaces)
   → Performance goal: <5 minutes migration
2. Load consolidation-strategy.md
   → Extract consolidation rules: 3 merges, 2 deletions
   → File mapping: 14 files → 8 files (39% reduction)
3. Load data-model.md
   → Extract file operation contracts (4 contracts)
4. Load contracts/migration-api.md
   → Extract 7 file operations API functions
5. Generate tasks by category:
   → Setup: script structure, dependencies (3 tasks)
   → Consolidation: merge overlapping docs (4 tasks)
   → Migration: file operations implementation (10 tasks)
   → Verification: pre/post checks (5 tasks)
   → Cleanup: workspace deletion, commit (4 tasks)
6. Apply task rules:
   → Different files = mark [P] for parallel
   → Consolidation before migration (TDD-like: plan before execute)
7. Number tasks sequentially (T001-T026)
8. Validate: All contracts → tests, all operations → implementation
9. Return: SUCCESS (26 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- Monorepo structure: `scripts/`, `server/`, `client/`, `lexicons/` at repository root
- Migration script: `scripts/migrate-vitepress-docs.ts`
- Source docs: `docs/**/*.md`
- Target docs: `server/*.md`, `client/*.md`, root `*.md`

---

## Phase 3.1: Setup (T001-T003)

### T001: Create migration script directory and initialize project
**Category**: Setup
**Depends On**: None
**Estimated Time**: 5 minutes
**Files**: `scripts/` (new directory)

**Description**:
Create the `scripts/` directory at repository root to house the migration script.

**Acceptance Criteria**:
- [x] `scripts/` directory exists
- [x] Directory is tracked by git

---

### T002: Install tsx dependency for TypeScript execution
**Category**: Setup
**Depends On**: None
**Estimated Time**: 2 minutes
**Files**: `package.json`

**Description**:
Install `tsx` as a dev dependency to enable direct TypeScript execution without compilation step.

**Steps**:
1. Run: `pnpm add -D tsx`
2. Verify `tsx` appears in `devDependencies` in root `package.json`

**Acceptance Criteria**:
- [x] `tsx` installed as devDependency
- [x] `pnpm install` completes without errors

---

### T003: [P] Add npm script for migration command
**Category**: Setup
**Depends On**: T002
**Estimated Time**: 2 minutes
**Files**: `package.json`

**Description**:
Add `migrate-docs` script to root `package.json` to execute the migration script.

**Steps**:
1. Edit root `package.json`
2. Add to `scripts` section: `"migrate-docs": "tsx scripts/migrate-vitepress-docs.ts"`

**Acceptance Criteria**:
- [x] `package.json` contains `migrate-docs` script
- [x] Script references correct file path

---

## Phase 3.2: Documentation Consolidation Analysis (T004-T007)

**CRITICAL: These tasks analyze and plan consolidation before any file operations**

### T004: [P] Analyze architecture documentation overlap
**Category**: Consolidation
**Depends On**: T001
**Estimated Time**: 10 minutes
**Files**: `docs/architecture/system-design.md`, `docs/architecture/database.md`

**Description**:
Read both architecture files and identify duplicate sections, complementary sections, and sections to merge. Document findings in consolidation plan.

**Steps**:
1. Read `docs/architecture/system-design.md` (316 lines)
2. Read `docs/architecture/database.md` (315 lines)
3. Identify duplicate architecture diagrams
4. Identify overlapping PDS-first architecture explanations
5. Create consolidation outline for `server/ARCHITECTURE.md`

**Acceptance Criteria**:
- [ ] Both files read completely
- [ ] Duplicate sections identified (list headings)
- [ ] Consolidation outline created with section mapping
- [ ] Estimated target size: ~400 lines (36% reduction from 631 lines)

---

### T005: [P] Analyze API documentation overlap
**Category**: Consolidation
**Depends On**: T001
**Estimated Time**: 10 minutes
**Files**: `docs/architecture/api.md`, `docs/reference/api-reference.md`

**Description**:
Read both API files and identify duplicate sections (authentication, error handling). Create consolidation plan.

**Steps**:
1. Read `docs/architecture/api.md` (168 lines - design principles)
2. Read `docs/reference/api-reference.md` (329 lines - endpoint reference)
3. Identify duplicate authentication explanations
4. Identify duplicate error response descriptions
5. Create consolidation outline for `server/API.md`

**Acceptance Criteria**:
- [ ] Both files read completely
- [ ] Duplicate sections identified
- [ ] Consolidation outline: Section 1 (principles), Section 2 (endpoints), Section 3 (examples)
- [ ] Estimated target size: ~350 lines (30% reduction from 497 lines)

---

### T006: [P] Verify outdated implementation documentation for deletion
**Category**: Consolidation
**Depends On**: T001
**Estimated Time**: 5 minutes
**Files**: `docs/reference/development-spec.md`, `docs/reference/implementation.md`

**Description**:
Verify that development-spec.md and implementation.md are outdated and can be safely deleted (content superseded by CLAUDE.md).

**Steps**:
1. Read `docs/reference/development-spec.md` (637 lines)
   - Check for "Phase 0 (Week 1-16)" references (outdated timeline)
   - Check for "Database: Cloudflare D1" references (old architecture)
2. Read `docs/reference/implementation.md` (481 lines)
   - Check for "2025-10-02" roadmap (outdated)
   - Verify content overlaps with CLAUDE.md "Implementation Status"
3. Confirm deletion is safe (no unique essential content)

**Acceptance Criteria**:
- [ ] Both files confirmed outdated
- [ ] No unique essential content found
- [ ] Deletion approved (ready for T012)

---

### T007: [P] Create consolidation function specifications
**Category**: Consolidation
**Depends On**: T004, T005
**Estimated Time**: 10 minutes
**Files**: `scripts/migrate-vitepress-docs.ts` (specification only, no code yet)

**Description**:
Based on T004 and T005 analysis, write function specifications for consolidation logic (interface definitions, consolidation rules).

**Steps**:
1. Define `ConsolidationRule` interface with `sources`, `destination`, `strategy` fields
2. Define consolidation rules array with 3 entries:
   - system-design.md + database.md → server/ARCHITECTURE.md
   - api.md + api-reference.md → server/API.md
   - development-spec.md + implementation.md → DELETE
3. Define `consolidateDocumentation()` function signature
4. Define `mergeSections()` function signature

**Acceptance Criteria**:
- [ ] TypeScript interfaces defined
- [ ] Consolidation rules array specified
- [ ] Function signatures documented
- [ ] No implementation code yet (specifications only)

---

## Phase 3.3: Migration Script Implementation (T008-T017)

### T008: [P] Implement file analysis function
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 15 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `analyzeDocumentationStructure()` function to scan `docs/` directory and classify files.

**Steps**:
1. Create `scripts/migrate-vitepress-docs.ts` file
2. Import Node.js `fs/promises`, `path` modules
3. Implement function to:
   - List all `*.md` files in `docs/` (exclude node_modules)
   - Classify as English (keep) or Japanese (delete)
   - Count VitePress-specific assets
4. Return `AnalysisResult` object

**Acceptance Criteria**:
- [ ] Function scans `docs/` recursively
- [ ] Returns counts: English files, Japanese files, assets
- [ ] Function signature matches contracts/migration-api.md spec
- [ ] No errors when run on actual `docs/` directory

---

### T009: [P] Implement content transformation function
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 20 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `transformDocumentationContent()` function to update links and remove images.

**Steps**:
1. Implement link update regex patterns:
   - VitePress URLs: `https://docs.atrarium.net/en/guide/concept.html` → `/CONCEPT.md`
   - Internal docs links: `docs/architecture/api.md` → `/server/API.md`
2. Implement image removal regex:
   - Pattern: `!\[([^\]]*)\]\(([^)]+)\)`
   - Replace with: `<!-- Image removed: $2 -->`
3. Return `TransformResult` with counts

**Acceptance Criteria**:
- [ ] Links updated to absolute repo paths
- [ ] Images removed with placeholder comments
- [ ] Function signature matches contracts/migration-api.md spec
- [ ] Test with sample markdown content

---

### T010: [P] Implement file migration function
**Category**: Implementation
**Depends On**: T008, T009
**Estimated Time**: 15 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `migrateDocumentationFile()` function to read, transform, and write files.

**Steps**:
1. Implement function to:
   - Read source file from `docs/`
   - Call `transformDocumentationContent()` on content
   - Ensure destination directory exists
   - Write transformed content to destination
2. Add error handling (source not found, destination exists, write failures)
3. Return `MigrationResult` with success status

**Acceptance Criteria**:
- [ ] Reads source file correctly
- [ ] Transforms content (calls T009 function)
- [ ] Writes to destination
- [ ] Error handling for common failures
- [ ] Function signature matches contracts/migration-api.md spec

---

### T011: Implement workspace configuration update functions
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 20 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `updateWorkspaceConfiguration()` function for pnpm-workspace.yaml and package.json updates.

**Steps**:
1. Implement YAML update:
   - Read `pnpm-workspace.yaml`
   - Remove line `  - 'docs'` from packages array (preserve indentation)
   - Write back
2. Implement JSON update:
   - Read root `package.json`
   - Delete `scripts['test:docs']` key
   - Write back with proper formatting (`JSON.stringify(pkg, null, 2) + '\n'`)
3. Return `WorkspaceUpdateResult`

**Acceptance Criteria**:
- [ ] YAML update preserves indentation
- [ ] JSON update preserves formatting
- [ ] Both functions handle file read/write errors
- [ ] Function signature matches contracts/migration-api.md spec

---

### T012: [P] Implement documentation reference update function
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 15 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `updateDocumentationReferences()` function to update README.md and CLAUDE.md references.

**Steps**:
1. Implement VitePress URL replacement:
   - Pattern: `https://docs.atrarium.net` references
   - Replace with component documentation index
2. Implement internal link updates:
   - Pattern: `docs/architecture/api.md` references
   - Replace with `/server/API.md`
3. Count replacements made
4. Return `ReferenceUpdateResult`

**Acceptance Criteria**:
- [ ] VitePress URLs replaced
- [ ] Internal links updated
- [ ] Replacement counts returned
- [ ] Function signature matches contracts/migration-api.md spec

---

### T013: Implement VitePress workspace deletion function
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 10 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `deleteVitepressWorkspace()` function to recursively delete `docs/` directory.

**Steps**:
1. Implement deletion with confirmation check
2. Calculate files/bytes to be deleted
3. Use `fs.rm(docsPath, { recursive: true, force: true })`
4. Verify directory no longer exists
5. Return `DeletionResult` with counts

**Acceptance Criteria**:
- [ ] Recursively deletes directory
- [ ] Calculates deletion stats
- [ ] Verifies deletion completed
- [ ] Function signature matches contracts/migration-api.md spec
- [ ] Safe error handling (directory not found = already deleted)

---

### T014: [P] Implement consolidation functions
**Category**: Implementation
**Depends On**: T007, T009
**Estimated Time**: 30 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement consolidation functions to merge overlapping documentation files.

**Steps**:
1. Implement `consolidateDocumentation()` main function:
   - Accept `ConsolidationRule` parameter
   - Handle 'merge' and 'delete' strategies
2. Implement `mergeSections()` helper:
   - Read multiple source files
   - Extract markdown sections (by heading level)
   - Merge according to consolidation outline from T004/T005
   - Write consolidated output
3. Apply consolidation rules from T007

**Acceptance Criteria**:
- [ ] Handles both 'merge' and 'delete' strategies
- [ ] Merges architecture files correctly (system-design + database)
- [ ] Merges API files correctly (api + api-reference)
- [ ] Skips outdated files (development-spec, implementation)
- [ ] Preserves markdown heading hierarchy

---

### T015: Implement CLI argument parsing
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 10 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement CLI argument parsing to support `--dry-run`, `--force`, `--verify-only` flags.

**Steps**:
1. Check `process.argv` for flags:
   - `--dry-run`: Preview operations without modifying files
   - `--force`: Execute with deletion (skip confirmation)
   - `--verify-only`: Run verification checks only
2. Set boolean flags based on arguments
3. Add help message for invalid flags

**Acceptance Criteria**:
- [ ] `--dry-run` flag detected
- [ ] `--force` flag detected
- [ ] `--verify-only` flag detected
- [ ] Help message displays usage
- [ ] Flags control script behavior

---

### T016: Implement main migration orchestration function
**Category**: Implementation
**Depends On**: T008-T015
**Estimated Time**: 20 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `main()` function to orchestrate the entire migration workflow.

**Steps**:
1. Parse CLI arguments (T015)
2. If `--dry-run`: Show file mapping, exit
3. If `--verify-only`: Run verification (T021), exit
4. Execute migration workflow:
   a. Run consolidation (T014) for each consolidation rule
   b. Migrate files (T010) for each non-consolidated file
   c. Update workspace config (T011)
   d. Update references (T012)
   e. If `--force`: Delete workspace (T013)
5. Print summary and next steps
6. Exit with appropriate code (0 = success, 1 = failure)

**Acceptance Criteria**:
- [ ] Respects all CLI flags
- [ ] Executes workflow in correct order
- [ ] Prints progress messages
- [ ] Handles errors gracefully
- [ ] Returns correct exit codes

---

### T017: Add file mapping configuration
**Category**: Implementation
**Depends On**: T003
**Estimated Time**: 10 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Add `FILE_MAPPING` constant to define source → destination file mappings for non-consolidated files.

**Steps**:
1. Define `FILE_MAPPING` object with entries:
   - `docs/reference/moderation-reasons.md` → `server/MODERATION_REASONS.md`
   - `docs/guide/concept.md` → `CONCEPT.md`
   - `docs/guide/quickstart.md` → `QUICKSTART.md`
   - `docs/guide/setup.md` → `SETUP.md`
   - `docs/CONTRIBUTING.md` → `CONTRIBUTING.md`
   - `docs/DEPLOYMENT.md` → `server/DEPLOYMENT.md`
2. Use mapping in T016 main function

**Acceptance Criteria**:
- [ ] File mapping matches research.md decisions
- [ ] All non-consolidated files included
- [ ] Mapping covers 6 files (keep-as-is files from consolidation-strategy.md)

---

## Phase 3.4: Verification (T018-T022)

### T018: [P] Create pre-migration verification checklist
**Category**: Verification
**Depends On**: T001
**Estimated Time**: 10 minutes
**Files**: `scripts/migrate-vitepress-docs.ts` (add verification function)

**Description**:
Implement pre-migration verification checks to ensure environment is ready.

**Steps**:
1. Implement `verifyPreMigration()` function to check:
   - `docs/` directory exists
   - `docs/.vitepress/config.ts` exists (VitePress config)
   - At least 10 `*.md` files in `docs/`
   - Component directories exist (lexicons/, server/, client/)
   - `pnpm-workspace.yaml` contains 'docs'
   - Root `package.json` contains `test:docs` script
2. Return verification result (pass/fail with details)

**Acceptance Criteria**:
- [ ] All 6 checks implemented
- [ ] Returns detailed failure messages
- [ ] Function called before migration starts (in T016 main)
- [ ] Aborts migration if verification fails

---

### T019: [P] Create post-migration verification function
**Category**: Verification
**Depends On**: T001
**Estimated Time**: 15 minutes
**Files**: `scripts/migrate-vitepress-docs.ts` (add verification function)

**Description**:
Implement post-migration verification checks to ensure migration completed successfully.

**Steps**:
1. Implement `verifyPostMigration()` function to check:
   - All expected destination files exist (8 files from consolidation-strategy.md)
   - `docs/` directory deleted
   - `pnpm-workspace.yaml` does not contain 'docs'
   - Root `package.json` does not contain `test:docs`
   - No VitePress URLs in README.md
   - No VitePress URLs in CLAUDE.md
2. Return verification result with file counts

**Acceptance Criteria**:
- [ ] All 6 checks implemented
- [ ] Returns list of missing files (if any)
- [ ] Returns list of remaining VitePress URLs (if any)
- [ ] Function called after migration completes (in T016 main)
- [ ] Reports detailed verification status

---

### T020: Test dry-run mode
**Category**: Verification
**Depends On**: T016
**Estimated Time**: 5 minutes
**Files**: None (testing only)

**Description**:
Test the migration script in dry-run mode to verify it shows planned operations without modifying files.

**Steps**:
1. Run: `npm run migrate-docs -- --dry-run`
2. Verify output shows:
   - Consolidation rules (3 merges)
   - File mapping (6 migrations)
   - Workspace config updates
   - Reference updates
3. Verify no files modified: `git status` shows no changes

**Acceptance Criteria**:
- [ ] Dry-run completes without errors
- [ ] Output shows all planned operations
- [ ] Git status shows no changes
- [ ] File mapping looks correct

---

### T021: Implement verification-only mode
**Category**: Verification
**Depends On**: T018, T019
**Estimated Time**: 5 minutes
**Files**: `scripts/migrate-vitepress-docs.ts`

**Description**:
Implement `--verify-only` mode to run verification checks without migration.

**Steps**:
1. In main function, check for `--verify-only` flag
2. If present:
   - Run `verifyPreMigration()` if docs/ exists
   - Run `verifyPostMigration()` if docs/ does not exist
3. Print verification results
4. Exit with code 0 (pass) or 2 (verification failed)

**Acceptance Criteria**:
- [ ] `--verify-only` flag detected
- [ ] Runs appropriate verification function
- [ ] Prints detailed results
- [ ] Returns correct exit code
- [ ] No migration operations performed

---

### T022: Test link validation after migration
**Category**: Verification
**Depends On**: T016 (after migration executed)
**Estimated Time**: 10 minutes
**Files**: None (testing only)

**Description**:
After executing migration, verify all internal documentation links resolve correctly.

**Steps**:
1. Search for markdown links: `grep -r "\[.*\](.*\.md)" server/ client/ lexicons/ *.md --exclude-dir=node_modules`
2. For each link found:
   - Extract target path
   - Verify target file exists
3. List any broken links
4. Verify no VitePress URLs remain: `grep -r "docs.atrarium.net" . --exclude-dir=node_modules --exclude-dir=.git`

**Acceptance Criteria**:
- [ ] All internal links checked
- [ ] No broken links found
- [ ] No VitePress URLs remain in codebase
- [ ] All links use absolute repo paths (format: `/server/API.md`)

---

## Phase 3.5: Cleanup and Finalization (T023-T026)

### T023: Execute migration with consolidation
**Category**: Cleanup
**Depends On**: T016, T020 (dry-run verified)
**Estimated Time**: 10 minutes
**Files**: Multiple (entire migration)

**Description**:
Execute the full migration including consolidation without workspace deletion.

**Steps**:
1. Run: `npm run migrate-docs` (without --force)
2. Monitor output for:
   - Consolidation progress (3 merges)
   - File migration progress (6 files)
   - Workspace config updates
   - Reference updates
3. If errors occur, investigate and fix before proceeding

**Acceptance Criteria**:
- [ ] Migration completes without errors
- [ ] All consolidated files created (server/ARCHITECTURE.md, server/API.md)
- [ ] All non-consolidated files migrated (6 files)
- [ ] Workspace config updated (pnpm-workspace.yaml, package.json)
- [ ] References updated (README.md, CLAUDE.md)
- [ ] `docs/` directory still exists (not yet deleted)

---

### T024: Verify migration completeness
**Category**: Cleanup
**Depends On**: T023
**Estimated Time**: 10 minutes
**Files**: None (verification only)

**Description**:
Run comprehensive verification checks after migration.

**Steps**:
1. Run: `npm run migrate-docs -- --verify-only`
2. Verify all checks pass:
   - Destination files exist (8 files)
   - Workspace config updated
   - References updated
3. Run manual checks from quickstart.md Step 7 (Verification)
4. Check consolidated file sizes:
   - `wc -l server/ARCHITECTURE.md` (expect ~400 lines)
   - `wc -l server/API.md` (expect ~350 lines)

**Acceptance Criteria**:
- [ ] Verification script passes all checks
- [ ] Workspace valid: `pnpm install` succeeds
- [ ] Build succeeds: `pnpm run build`
- [ ] Consolidated files match expected sizes
- [ ] Content integrity preserved (no information loss)

---

### T025: Delete VitePress workspace
**Category**: Cleanup
**Depends On**: T024 (verification passed)
**Estimated Time**: 5 minutes
**Files**: `docs/` (delete)

**Description**:
Delete the VitePress workspace after verifying migration completed successfully.

**Steps**:
1. Backup docs/ directory (optional safety measure):
   ```bash
   mkdir -p .specify/backups/012-vitepress
   tar -czf .specify/backups/012-vitepress/docs.backup.tar.gz docs/
   ```
2. Run: `npm run migrate-docs -- --force` (or manually: `rm -rf docs/`)
3. Verify deletion: `ls docs/` should return "no such file or directory"
4. Run: `pnpm install` to refresh workspace

**Acceptance Criteria**:
- [ ] `docs/` directory completely deleted
- [ ] No residual VitePress files
- [ ] `pnpm install` succeeds without errors
- [ ] Backup created (if using safety measure)

---

### T026: Commit changes
**Category**: Cleanup
**Depends On**: T025
**Estimated Time**: 5 minutes
**Files**: All modified files

**Description**:
Stage and commit all changes from the migration.

**Steps**:
1. Review changes: `git status`
2. Expected changes:
   - New files: 8 documentation files (server/, root)
   - Modified: pnpm-workspace.yaml, package.json, README.md, CLAUDE.md
   - Deleted: docs/ directory (~100+ files)
3. Stage all: `git add .`
4. Commit with message:
   ```
   feat: remove VitePress hosting and consolidate documentation

   - Remove VitePress workspace from pnpm workspaces
   - Consolidate overlapping documentation (39% size reduction)
   - Migrate documentation to component directories
   - Delete outdated implementation docs (development-spec, implementation)
   - Update README.md and CLAUDE.md references
   - Remove Japanese translations (keep English only)
   - Delete docs.atrarium.net deployment configuration

   Consolidated files:
   - server/ARCHITECTURE.md (system-design + database: 631→400 lines)
   - server/API.md (api + api-reference: 497→350 lines)

   Deleted outdated files:
   - development-spec.md (637 lines)
   - implementation.md (481 lines)

   Total documentation: 3,814 → 2,318 lines (39% reduction)

   Related: #012
   ```

**Acceptance Criteria**:
- [ ] All changes staged
- [ ] Commit created with descriptive message
- [ ] Commit includes all modified, new, and deleted files
- [ ] Branch ready for merge to master

---

## Dependencies

```
Setup:
  T001 (create directory) → T004-T007 (analysis tasks)
  T002 (install tsx) → T003 (add npm script)
  T003 (npm script) → T008-T017 (implementation tasks)

Consolidation Analysis:
  T004 [P] (architecture analysis)
  T005 [P] (API analysis)
  T006 [P] (verify outdated)
  T007 (consolidation specs) ← depends on T004, T005

Implementation:
  T008 [P] (file analysis)
  T009 [P] (content transformation)
  T010 (file migration) ← depends on T008, T009
  T011 (workspace config)
  T012 [P] (reference update)
  T013 (workspace deletion)
  T014 (consolidation) ← depends on T007, T009
  T015 [P] (CLI args)
  T016 (main function) ← depends on T008-T015
  T017 [P] (file mapping)

Verification:
  T018 [P] (pre-migration checks)
  T019 [P] (post-migration checks)
  T020 (test dry-run) ← depends on T016
  T021 (verify-only mode) ← depends on T018, T019
  T022 (link validation) ← depends on T023 (after migration)

Cleanup:
  T023 (execute migration) ← depends on T016, T020
  T024 (verify completeness) ← depends on T023
  T025 (delete workspace) ← depends on T024
  T026 (commit) ← depends on T025
```

## Parallel Execution Examples

### Phase 3.2: Consolidation Analysis (T004-T006 in parallel)
```bash
# All analysis tasks can run in parallel (different files, read-only)
Task 1: "Analyze architecture documentation overlap in docs/architecture/system-design.md and docs/architecture/database.md"
Task 2: "Analyze API documentation overlap in docs/architecture/api.md and docs/reference/api-reference.md"
Task 3: "Verify outdated implementation documentation in docs/reference/development-spec.md and docs/reference/implementation.md"
```

### Phase 3.3: Implementation (T008-T009, T011-T012, T015, T017 in parallel)
```bash
# Independent implementation tasks (different functions, no shared state)
Task 1: "Implement file analysis function analyzeDocumentationStructure() in scripts/migrate-vitepress-docs.ts"
Task 2: "Implement content transformation function transformDocumentationContent() in scripts/migrate-vitepress-docs.ts"
Task 3: "Implement documentation reference update function updateDocumentationReferences() in scripts/migrate-vitepress-docs.ts"
Task 4: "Implement CLI argument parsing for --dry-run, --force, --verify-only flags"
Task 5: "Add FILE_MAPPING configuration constant with 6 file mappings"
```

### Phase 3.4: Verification (T018-T019 in parallel)
```bash
# Verification functions (different checks, no dependencies)
Task 1: "Create pre-migration verification checklist with 6 checks"
Task 2: "Create post-migration verification function with 6 checks"
```

## Notes

- **[P] tasks** = Different files or independent operations, can run in parallel
- **Consolidation-first**: Tasks T004-T007 analyze and plan merges before any file operations
- **Verification checkpoints**: Pre-migration (T018), post-migration (T019, T021), link validation (T022)
- **Safety measures**: Dry-run (T020), backup before deletion (T025), verification before deletion (T024)
- **Commit strategy**: Single commit after all operations complete (T026)

## Success Metrics

- **Documentation Size**: 3,814 lines → 2,318 lines (39% reduction)
- **Outdated Content Deleted**: 1,118 lines (29% of original)
- **Files Consolidated**: 4 files → 2 files (architecture, API)
- **Files Preserved**: 6 files migrated as-is
- **Migration Time**: <10 minutes (estimated)
- **Zero Data Loss**: All essential content preserved in consolidated files

---

**Ready for execution**: Tasks T001-T026 ready for sequential implementation with parallel execution opportunities marked [P].

**Next Step**: Begin with Phase 3.1 Setup (T001-T003) to prepare migration environment.
