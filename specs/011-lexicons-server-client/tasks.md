# Tasks: Reorganize Implementation into Lexicons, Server, and Client

**Input**: Design documents from `/workspaces/atrarium/specs/011-lexicons-server-client/`
**Prerequisites**: plan.md (✅), research.md (✅), data-model.md (✅), quickstart.md (✅)

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Found: Tech stack, structure, migration strategy
2. Load optional design documents:
   → ✅ research.md: Monorepo strategy, npm workspaces, git mv
   → ✅ data-model.md: No new entities (structural only)
   → ✅ quickstart.md: Validation scenarios extracted
3. Generate tasks by category:
   → Setup: Verify git status, create directories
   → Move Server: git mv src/, tests/, configs to server/
   → Move Client: git mv dashboard/ to client/ (docs stays at root)
   → Update Configs: package.json, tsconfig.json, wrangler.toml
   → Update Imports: Fix import paths in all files
   → Update Docs: README.md, CLAUDE.md
   → Validation: typecheck, test, build
4. Apply task rules:
   → Sequential execution (git mv preserves history)
   → Validation after each major phase
5. Number tasks sequentially (T001-T040)
6. Dependencies: Each phase blocks next phase
7. No parallel tasks (git operations must be sequential)
8. Validate task completeness: ✅
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] Description`
- Sequential execution (no [P] markers - git operations require ordering)
- Include exact file paths in descriptions
- Validation checkpoints after each phase

## Path Conventions
Repository root: `/workspaces/atrarium/`
Target structure: `lexicons/`, `server/`, `client/` (dashboard only), `docs/` (stays at root)

---

## Phase 0: Preparation
- [ ] **T001** Verify git status clean (no uncommitted changes)
- [ ] **T002** Create `server/` directory at repository root
- [ ] **T003** Create `client/` directory at repository root
- [ ] **T004** Record current structure for comparison (`tree -L 2 -d . > /tmp/structure-before.txt`)

---

## Phase 1: Move Server Code
**IMPORTANT**: Use `git mv` to preserve history. Do NOT copy+delete.

- [ ] **T005** Move server source code: `git mv src/ server/src/`
- [ ] **T006** Create temporary directory for docs tests: `mkdir -p /tmp/docs-tests-backup && cp -r tests/docs/ /tmp/docs-tests-backup/`
- [ ] **T007** Move server tests (excluding docs): `git mv tests/ server/tests/`
- [ ] **T008** Restore docs tests to original location: `mkdir -p tests/docs && mv /tmp/docs-tests-backup/docs/* tests/docs/ && rm -rf /tmp/docs-tests-backup`
- [ ] **T009** Move wrangler config: `git mv wrangler.toml server/wrangler.toml`
- [ ] **T010** Move server vitest config: `git mv vitest.config.ts server/vitest.config.ts`
- [ ] **T011** Move PDS vitest config: `git mv vitest.pds.config.ts server/vitest.pds.config.ts`
- [ ] **T012** Verify server structure: `ls -la server/src/ server/tests/ server/wrangler.toml`

---

## Phase 2: Move Client Code (Dashboard Only)

- [ ] **T013** Move dashboard: `git mv dashboard/ client/dashboard/`
- [ ] **T014** Verify client structure: `ls -la client/dashboard/`
- [ ] **T015** Verify docs remains at root: `ls -la docs/`

---

## Phase 3: Create Server Configuration Files

- [ ] **T016** Create `server/package.json` with server dependencies (Hono, @atproto/api, Zod, Vitest, Cloudflare packages)
- [ ] **T017** Create `server/tsconfig.json` extending root config with server-specific paths
- [ ] **T018** Update `server/wrangler.toml` entry point from `src/index.ts` to `./src/index.ts`

---

## Phase 4: Update Root Configuration Files

- [ ] **T019** Update root `package.json`: Add workspaces array `["server", "client/dashboard", "docs"]`
- [ ] **T020** Update root `package.json`: Add workspace scripts for build, test, dev, typecheck
- [ ] **T021** Update root `tsconfig.json`: Add project references to server, client/dashboard, docs
- [ ] **T022** Update `.gitignore`: Add `server/node_modules`, `server/dist`, `server/.wrangler`, update paths for client

---

## Phase 5: Update Server Import Paths

- [ ] **T023** Update imports in `server/src/index.ts`: Fix relative paths for durable-objects, routes, services, utils, workers
- [ ] **T024** Update imports in `server/src/router.ts`: Fix relative paths for routes
- [ ] **T025** Update imports in `server/src/routes/*.ts` (all route files): Fix relative paths for services, schemas, utils, types
- [ ] **T026** Update imports in `server/src/durable-objects/*.ts`: Fix relative paths for types, schemas, utils
- [ ] **T027** Update imports in `server/src/workers/*.ts`: Fix relative paths for durable-objects, services
- [ ] **T028** Update imports in `server/src/services/*.ts`: Fix relative paths for schemas, utils, types
- [ ] **T029** Update imports in `server/tests/**/*.test.ts`: Fix paths from `../src/` to `../src/` (should still work) and from `../../src/` to `../../src/`
- [ ] **T030** Update lexicon imports: Change from `../lexicons/` to `../../lexicons/` in server files

---

## Phase 6: Update Client Import Paths

- [ ] **T031** Update imports in `client/dashboard/src/**/*.ts(x)`: Fix API client paths if they reference server types (should use API contracts only)
- [ ] **T032** Update lexicon imports in dashboard: Change from `../../lexicons/` to `../../../lexicons/` if needed
- [ ] **T033** Update paths in `client/dashboard/vite.config.ts`: No changes needed (uses relative paths)

---

## Phase 7: Update Documentation

- [ ] **T034** Update `README.md`: Replace references to `src/` → `server/src/`, `tests/` → `server/tests/`, `dashboard/` → `client/dashboard/` (keep `docs/` as is)
- [ ] **T035** Update `CLAUDE.md`: Update "Project Structure" section with new directory layout (lexicons/, server/, client/dashboard/, docs/)
- [ ] **T036** Update `CLAUDE.md`: Update "Development Commands" section with workspace-aware commands
- [ ] **T037** Update `CLAUDE.md`: Update all file path references throughout the document
- [ ] **T038** Update docs content in `docs/en/*.md`: Update any code examples or file path references if needed
- [ ] **T039** Update docs content in `docs/ja/*.md`: Update Japanese docs to match English updates if needed

---

## Phase 8: Validation & Testing

- [ ] **T040** Install workspace dependencies: `npm install`
- [ ] **T041** Verify workspace structure: `npm ls --workspaces` (should list server, client/dashboard, docs)
- [ ] **T042** Run TypeScript type checking: `npm run typecheck` (must pass with no errors)
- [ ] **T043** Run server tests: `npm test --workspace=server` (must pass all tests)
- [ ] **T044** Run dashboard tests: `npm test --workspace=client/dashboard` (must pass all tests)
- [ ] **T045** Run docs tests: `npm test --workspace=docs` (must pass all tests)
- [ ] **T046** Build server: `npm run build --workspace=server` (Wrangler build must succeed)
- [ ] **T047** Build dashboard: `npm run build --workspace=client/dashboard` (Vite build must succeed)
- [ ] **T048** Build docs: `npm run build --workspace=docs` (VitePress build must succeed)
- [ ] **T049** Compare directory structure: `tree -L 2 -d . > /tmp/structure-after.txt && diff /tmp/structure-before.txt /tmp/structure-after.txt`
- [ ] **T050** Verify git history preserved: `git log --follow server/src/index.ts | head -20` (should show history from src/index.ts)

---

## Dependencies

### Sequential Phases (must complete in order):
1. **Phase 0 (T001-T004)** → Preparation complete
2. **Phase 1 (T005-T012)** → Server moved
3. **Phase 2 (T013-T015)** → Client (dashboard) moved
4. **Phase 3 (T016-T018)** → Server configs created
5. **Phase 4 (T019-T022)** → Root configs updated
6. **Phase 5 (T023-T030)** → Server imports fixed
7. **Phase 6 (T031-T033)** → Client imports fixed
8. **Phase 7 (T034-T039)** → Documentation updated
9. **Phase 8 (T040-T050)** → Validation complete

### Critical Checkpoints:
- ✅ After T004: Structure recorded for comparison
- ✅ After T012: Server files moved successfully
- ✅ After T015: Dashboard moved, docs verified at root
- ✅ After T022: Configuration files updated
- ✅ After T030: Server imports fixed
- ✅ After T033: Client imports fixed
- ✅ After T039: Documentation updated
- ✅ After T050: Full validation passed

---

## Notes

### Git History Preservation
All file moves use `git mv` to preserve blame history. Verify with:
```bash
git log --follow server/src/index.ts
```

### Rollback Procedure
If validation fails at any checkpoint:
```bash
git reset --hard HEAD~1
npm install
npm test
```

### Import Path Patterns
**Server files** referencing lexicons:
- Before: `import config from '../lexicons/net.atrarium.community.config.json'`
- After: `import config from '../../lexicons/net.atrarium.community.config.json'`

**Client files** referencing lexicons (if needed):
- Before: `import config from '../../lexicons/net.atrarium.community.config.json'`
- After: `import config from '../../../lexicons/net.atrarium.community.config.json'`

### Configuration Updates

**Root package.json workspaces**:
```json
{
  "workspaces": ["server", "client/dashboard", "docs"],
  "scripts": {
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "typecheck": "npm run typecheck --workspaces",
    "dev": "npm run dev --workspace=server"
  }
}
```

**Root tsconfig.json references**:
```json
{
  "references": [
    { "path": "./server" },
    { "path": "./client/dashboard" },
    { "path": "./docs" }
  ]
}
```

---

## Validation Checklist
*Completed by Phase 8 tasks*

- [ ] All files moved using `git mv` (history preserved)
- [ ] No files lost (`git status` shows only renames)
- [ ] TypeScript compilation succeeds (all workspaces)
- [ ] All tests pass (server + dashboard + docs)
- [ ] All builds succeed (server + dashboard + docs)
- [ ] Documentation updated (README.md, CLAUDE.md)
- [ ] Git history verifiable (`git log --follow`)

---

## Success Criteria (from spec.md)

### FR-001: Lexicon schemas organized
✅ `lexicons/` directory unchanged, already isolated

### FR-002: Server code organized
✅ All backend code in `server/` (src, tests, configs)

### FR-003: Client code organized
✅ Dashboard in `client/dashboard/`, docs remains at root `docs/`

### FR-004: Functionality maintained
✅ All tests pass, builds succeed

### FR-005: Import paths updated
✅ Tasks T023-T033 update all import paths

### FR-006: Build configs updated
✅ Tasks T016-T022 update all configurations

### FR-007: Test configs updated
✅ Vitest configs moved with server tests

### FR-008: Documentation updated
✅ Tasks T034-T039 update README, CLAUDE, docs

---

## Estimated Time: 1.5-2 hours
- Phase 0-2: 20 min (file moves)
- Phase 3-4: 15 min (config creation)
- Phase 5-6: 45 min (import updates)
- Phase 7: 20 min (docs updates)
- Phase 8: 20 min (validation)

**Total Tasks**: 50 sequential tasks
**Parallelization**: None (git operations must be sequential)
**Validation Points**: 8 major checkpoints
