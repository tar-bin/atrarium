# Refactoring Contract: Project File Organization

**Feature**: 020- | **Date**: 2025-10-11
**Purpose**: Define the validation contract for code reorganization

---

## Overview

This is not a traditional API contract (no HTTP endpoints or RPC methods). Instead, it defines the **validation contract** for the refactoring operation - the conditions that MUST be satisfied before, during, and after reorganization.

---

## Pre-Conditions (Before Refactoring)

### PC-001: Baseline Validation
**Contract**: Current codebase must pass all quality checks

**Validation**:
```bash
# Must succeed before starting refactoring
pnpm -r typecheck  # TypeScript compilation
pnpm -r test       # Test suite
pnpm lint          # Biome linter
pnpm format:check  # Biome formatter
```

**Exit criteria**: All commands exit with code 0

**Rationale**: Establish baseline to isolate refactoring-introduced issues

---

### PC-002: Identify Refactoring Candidates
**Contract**: Files exceeding 500 lines OR containing multiple domains must be identified

**Validation**:
```bash
# Server candidates
wc -l server/src/services/atproto.ts        # Expected: >1600 lines
wc -l server/src/durable-objects/community-feed-generator.ts  # Expected: >1300 lines

# Client candidates
wc -l client/src/lib/hooks.ts               # Expected: >400 lines
wc -l client/src/lib/api.ts                 # Expected: >350 lines
```

**Exit criteria**: At least 4 files identified as candidates (FR-001)

---

### PC-003: Identify Duplicate Utilities
**Contract**: Duplicate utility functions must be identified across server/client

**Validation**:
```bash
# Search for duplicate utilities
grep -r "validateCustomEmoji" server/src/utils/ client/src/lib/
grep -r "generateHashtag" server/src/utils/ client/src/lib/
grep -r "validateDID" server/src/utils/ client/src/lib/
```

**Exit criteria**: At least 2 duplicate utility functions found (FR-011)

---

## During Refactoring

### DR-001: Incremental Validation
**Contract**: After each file split or move, imports must be updated and validated

**Validation**:
```bash
# After each refactoring step
pnpm --filter server typecheck  # Server imports resolve
pnpm --filter client typecheck  # Client imports resolve
```

**Exit criteria**: TypeScript compilation succeeds (FR-008)

---

### DR-002: Domain Cohesion Check
**Contract**: Each new module must contain files from a single domain

**Validation**:
- Manual code review: Verify `services/atproto/communities.ts` only contains community-related methods
- Manual code review: Verify `lib/hooks/useCommunities.ts` only contains community-related hooks

**Exit criteria**: No cross-domain logic in individual modules (FR-002)

---

## Post-Conditions (After Refactoring)

### POST-001: TypeScript Compilation
**Contract**: All workspaces must compile without errors

**Validation**:
```bash
pnpm -r typecheck
```

**Expected output**:
```
> server@0.1.0 typecheck /workspaces/atrarium/server
> tsc --noEmit

> client@0.1.0 typecheck /workspaces/atrarium/client
> tsc --project tsconfig.app.json --noEmit

> @atrarium/contracts@0.1.0 typecheck /workspaces/atrarium/shared/contracts
> tsc --noEmit
```

**Exit criteria**: All commands exit with code 0 (FR-008)

**Failure handling**: If fails, identify missing imports via error messages and fix

---

### POST-002: Test Suite Pass
**Contract**: All tests must pass without modification

**Validation**:
```bash
pnpm -r test
```

**Expected output**:
```
> server@0.1.0 test /workspaces/atrarium/server
> vitest run
Test Files  XX passed (XX)
Tests  XX passed (XX)

> client@0.1.0 test /workspaces/atrarium/client
> vitest run
Test Files  XX passed (XX)
Tests  XX passed (XX)
```

**Exit criteria**: All test suites pass (FR-009)

**Failure handling**: If tests fail due to import changes, update test imports

---

### POST-003: Linting and Formatting
**Contract**: Code must pass Biome linter and formatter checks

**Validation**:
```bash
pnpm lint          # Biome linter
pnpm format:check  # Biome formatter (check only)
```

**Exit criteria**: Both commands exit with code 0 (Principle 7)

**Failure handling**: Run `pnpm lint:fix` and `pnpm format` to auto-fix issues

---

### POST-004: File Organization Validation
**Contract**: Target file structure must match design

**Validation**:
```bash
# Server structure
ls -la server/src/services/atproto/
# Expected files: index.ts, communities.ts, memberships.ts, emoji.ts, moderation.ts

# Client structure
ls -la client/src/lib/hooks/
# Expected files: index.ts, useCommunities.ts, useMemberships.ts, useModeration.ts

# Shared utilities
ls -la shared/utils/src/
# Expected files: emoji.ts, hashtag.ts, validation.ts
```

**Exit criteria**: All expected files exist (FR-005, FR-006, FR-011)

---

### POST-005: Import Path Validation
**Contract**: All imports must use new paths, no old paths remaining

**Validation**:
```bash
# Search for old import paths (should return no results)
grep -r "from '../services/atproto'" server/src/routes/
grep -r "from '../lib/hooks'" client/src/components/

# Verify new import paths exist
grep -r "from '../services/atproto/communities'" server/src/routes/
grep -r "from '../lib/hooks'" client/src/components/  # Barrel export
grep -r "from '@atrarium/utils'" server/src/ client/src/
```

**Exit criteria**: No old import paths found, new paths used (FR-004)

---

### POST-006: Line Count Reduction
**Contract**: Split files must be smaller than original

**Validation**:
```bash
# Original: server/src/services/atproto.ts (~1606 lines)
# After split:
wc -l server/src/services/atproto/communities.ts  # Expected: <500 lines
wc -l server/src/services/atproto/memberships.ts  # Expected: <500 lines
wc -l server/src/services/atproto/emoji.ts        # Expected: <400 lines
wc -l server/src/services/atproto/moderation.ts   # Expected: <400 lines

# Original: client/src/lib/hooks.ts (~433 lines)
# After split:
wc -l client/src/lib/hooks/useCommunities.ts   # Expected: <200 lines
wc -l client/src/lib/hooks/useMemberships.ts   # Expected: <150 lines
wc -l client/src/lib/hooks/useModeration.ts    # Expected: <100 lines
```

**Exit criteria**: All split files under 500 lines (FR-001)

---

### POST-007: Duplicate Elimination Validation
**Contract**: Duplicate utilities must be removed from server/client

**Validation**:
```bash
# Old server utilities should not exist
test ! -f server/src/utils/emoji-validator.ts
test ! -f server/src/utils/hashtag.ts

# Old client utilities should not exist (if applicable)
test ! -f client/src/lib/emoji-utils.ts
test ! -f client/src/lib/hashtag.ts

# New shared utilities must exist
test -f shared/utils/src/emoji.ts
test -f shared/utils/src/hashtag.ts
```

**Exit criteria**: Old files deleted, new shared files created (FR-011)

---

### POST-008: Documentation Update Validation
**Contract**: README files must document new structure

**Validation**:
```bash
# Check for structure documentation
grep "services/atproto/" server/README.md
grep "lib/hooks/" client/README.md
grep "shared/utils/" README.md
```

**Exit criteria**: README files updated with new structure (FR-010)

---

## Rollback Contract

### RB-001: Rollback Trigger Conditions
**Contract**: Rollback required if any POST-condition fails

**Trigger conditions**:
- `pnpm -r typecheck` fails (POST-001)
- `pnpm -r test` fails (POST-002)
- Critical imports broken (POST-005)

**Rollback procedure**:
1. `git reset --hard HEAD~1` (if committed)
2. `git stash` (if uncommitted)
3. Restore from backup branch (if created)

---

### RB-002: Partial Rollback (Per-Workspace)
**Contract**: If only one workspace fails validation, rollback that workspace only

**Example**:
```bash
# If only server fails typecheck
git checkout HEAD -- server/
pnpm --filter server typecheck  # Verify rollback

# Continue with client refactoring
```

---

## Acceptance Criteria Summary

All POST-conditions must be satisfied for refactoring acceptance:

| ID | Criterion | Validation Command | Success Indicator |
|----|-----------|-------------------|-------------------|
| POST-001 | TypeScript compilation | `pnpm -r typecheck` | Exit code 0 |
| POST-002 | Test suite pass | `pnpm -r test` | Exit code 0 |
| POST-003 | Linting/formatting | `pnpm lint && pnpm format:check` | Exit code 0 |
| POST-004 | File structure | `ls` commands | Expected files exist |
| POST-005 | Import paths | `grep` searches | No old paths, new paths used |
| POST-006 | Line count reduction | `wc -l` commands | All files <500 lines |
| POST-007 | Duplicate elimination | `test -f` commands | Old files deleted, new files created |
| POST-008 | Documentation | `grep` README.md | Structure documented |

**Final acceptance**: All 8 POST-conditions satisfied + no rollback triggers activated

---

## Notes

- **No API endpoints**: This refactoring does not change HTTP/RPC APIs (Principle 1 N/A)
- **No database contracts**: No PDS/Lexicon schema changes (Principle 8 N/A)
- **Git history loss**: Acceptable per clarification (FR-012)
- **Breaking changes**: Acceptable for internal code (FR-003)
