# Tasks: Project File Organization

**Input**: Design documents from `/workspaces/atrarium/specs/020-/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/refactoring-contract.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript 5.7, React 19, pnpm workspaces monorepo
2. Load design documents:
   → data-model.md: 6 entities (SourceFile, Module, SharedUtility, OrphanedFile, ImportDependency, RefactoringTask)
   → contracts/refactoring-contract.md: 3 pre-conditions, 8 post-conditions
   → quickstart.md: 10-step validation guide
   → research.md: 7 research decisions (DDD, orphaned files, shared utilities)
3. Generate tasks by category:
   → Preparation: baseline validation, candidate identification, orphaned file cleanup
   → Shared: create @atrarium/utils workspace, consolidate duplicates
   → Server: split atproto.ts (1606 lines) by domain
   → Client: split hooks.ts (433 lines) by feature
   → Documentation: update README files
   → Validation: full test suite, linting, commit
4. Apply task rules:
   → Sequential execution (refactoring requires incremental validation)
   → No parallel tasks (imports validation dependencies)
5. Number tasks sequentially (T001-T027)
6. Validate: All quickstart steps covered, all POST-conditions mapped
```

## Format: `[ID] Description`
- Sequential execution (no [P] markers - all tasks depend on previous validation)
- Include exact file paths and validation commands

## Phase 3.1: Preparation & Baseline Validation

- [ ] **T001** Run baseline validation (refactoring-contract.md PC-001)
  - Navigate to `/workspaces/atrarium`
  - Run: `pnpm -r typecheck && pnpm -r test && pnpm lint && pnpm format:check`
  - Verify: All commands exit with code 0
  - If fails: Fix existing issues before proceeding
  - Deliverable: Clean baseline (all checks passing)

- [ ] **T002** Identify refactoring candidates (refactoring-contract.md PC-002, quickstart.md Step 1)
  - Run: `find server/src -name "*.ts" -exec wc -l {} + | sort -rn | head -10`
  - Run: `find client/src -name "*.ts" -o -name "*.tsx" -exec wc -l {} + | sort -rn | head -10`
  - Expected findings:
    - `server/src/services/atproto.ts`: ~1606 lines
    - `server/src/durable-objects/community-feed-generator.ts`: ~1369 lines
    - `client/src/lib/hooks.ts`: ~433 lines
    - `client/src/lib/api.ts`: ~352 lines
  - Verify: At least 4 files exceed 500 lines
  - Deliverable: List of files to refactor

- [ ] **T003** Identify duplicate utilities (refactoring-contract.md PC-003)
  - Run: `grep -r "validateEmoji" server/src/utils/ client/src/lib/`
  - Run: `grep -r "Hashtag" server/src/utils/ client/src/lib/`
  - Expected findings: Duplicate emoji/hashtag utilities in server and client
  - Verify: At least 2 duplicate utility functions found
  - Deliverable: List of utilities to consolidate

- [ ] **T004** Cleanup orphaned files (data-model.md Entity 4: OrphanedFile, research.md R7)
  - Run: `find /workspaces/atrarium/client/@ -type f 2>/dev/null`
  - Run: `diff /workspaces/atrarium/client/@/components/ui/popover.tsx /workspaces/atrarium/client/src/components/ui/popover.tsx`
  - Review diff: Minor export order + className attribute changes
  - Action: Canonical version (`src/`) is newer, delete orphaned
  - Run: `rm -rf /workspaces/atrarium/client/@`
  - Verify: `test ! -d /workspaces/atrarium/client/@`
  - Run: `pnpm --filter client typecheck`
  - Deliverable: Orphaned `client/@/` directory removed, TypeScript compilation passes

## Phase 3.2: Shared Utilities Workspace

- [ ] **T005** Create `@atrarium/utils` workspace (quickstart.md Step 2-3)
  - Create directory: `mkdir -p /workspaces/atrarium/shared/utils/src`
  - Create `shared/utils/package.json`:
    ```json
    {
      "name": "@atrarium/utils",
      "version": "0.1.0",
      "type": "module",
      "exports": {
        "./emoji": "./src/emoji.ts",
        "./hashtag": "./src/hashtag.ts",
        "./validation": "./src/validation.ts"
      },
      "devDependencies": {
        "typescript": "^5.7.0"
      }
    }
    ```
  - Create `shared/utils/tsconfig.json`:
    ```json
    {
      "extends": "../../tsconfig.json",
      "compilerOptions": {
        "outDir": "./dist",
        "rootDir": "./src"
      },
      "include": ["src/**/*"]
    }
    ```
  - Add to `pnpm-workspace.yaml`: `grep -q "shared/utils" pnpm-workspace.yaml || echo "  - 'shared/utils'" >> pnpm-workspace.yaml`
  - Run: `pnpm install`
  - Verify: `shared/utils/` directory created with package.json and tsconfig.json
  - Deliverable: `@atrarium/utils` workspace scaffold

- [ ] **T006** Consolidate emoji utilities to `shared/utils/src/emoji.ts`
  - Extract `validateCustomEmoji` from `server/src/utils/emoji-validator.ts`
  - Extract emoji utilities from `client/src/lib/emoji.ts` (if exists)
  - Create `shared/utils/src/emoji.ts` with consolidated functions
  - Run: `pnpm --filter @atrarium/utils typecheck`
  - Verify: Shared emoji utilities compile without errors
  - Deliverable: `shared/utils/src/emoji.ts` with emoji validation functions

- [ ] **T007** Consolidate hashtag utilities to `shared/utils/src/hashtag.ts`
  - Extract `generateCommunityHashtag` from `server/src/utils/hashtag.ts`
  - Extract hashtag utilities from `client/src/lib/hashtag.ts`
  - Create `shared/utils/src/hashtag.ts` with consolidated functions
  - Run: `pnpm --filter @atrarium/utils typecheck`
  - Verify: Shared hashtag utilities compile without errors
  - Deliverable: `shared/utils/src/hashtag.ts` with hashtag generation functions

- [ ] **T008** Update server imports to use `@atrarium/utils`
  - Find usages: `grep -r "from.*emoji-validator" server/src/`
  - Find usages: `grep -r "from.*hashtag" server/src/`
  - Replace: `import { validateCustomEmoji } from '../utils/emoji-validator'` → `import { validateCustomEmoji } from '@atrarium/utils/emoji'`
  - Replace: `import { generateCommunityHashtag } from '../utils/hashtag'` → `import { generateCommunityHashtag } from '@atrarium/utils/hashtag'`
  - Delete: `server/src/utils/emoji-validator.ts`, `server/src/utils/hashtag.ts`
  - Run: `pnpm --filter server typecheck`
  - Verify: Server imports resolve, no old utility files remain
  - Deliverable: Server uses shared utilities, old files deleted

- [ ] **T009** Update client imports to use `@atrarium/utils`
  - Find usages: `grep -r "from.*emoji" client/src/lib/`
  - Find usages: `grep -r "from.*hashtag" client/src/lib/`
  - Replace client imports: `import { validateCustomEmoji } from './emoji'` → `import { validateCustomEmoji } from '@atrarium/utils/emoji'`
  - Delete old client utility files (if separate from main files)
  - Run: `pnpm --filter client typecheck`
  - Verify: Client imports resolve, no duplicate utilities remain
  - Deliverable: Client uses shared utilities

## Phase 3.3: Server Refactoring

- [ ] **T010** Create `server/src/services/atproto/` directory structure (quickstart.md Step 4)
  - Create directory: `mkdir -p /workspaces/atrarium/server/src/services/atproto`
  - Create barrel export `server/src/services/atproto/index.ts`:
    ```typescript
    export { ATProtoService } from './base';
    export * from './communities';
    export * from './memberships';
    export * from './emoji';
    export * from './moderation';
    ```
  - Verify: Directory and barrel export created
  - Deliverable: `services/atproto/` scaffold with index.ts

- [ ] **T011** Split `server/src/services/atproto.ts` into `base.ts`
  - Extract `ATProtoService` class constructor and `getAgent()` method to `server/src/services/atproto/base.ts`
  - Include only agent initialization logic (no domain-specific methods)
  - Run: `pnpm --filter server typecheck`
  - Verify: `base.ts` compiles independently
  - Deliverable: `server/src/services/atproto/base.ts` with ATProtoService initialization

- [ ] **T012** Extract community methods to `server/src/services/atproto/communities.ts`
  - Extract community-related methods from original `atproto.ts`:
    - `createCommunityConfig`, `getCommunityConfig`, `updateCommunityConfig`
    - `getCommunityStatsDetailed`, `getCommunityChildrenWithMetadata`
    - `validateCircularReference`
  - Import `ATProtoService` from `./base`
  - Expected size: <500 lines
  - Run: `pnpm --filter server typecheck`
  - Verify: File compiles, <500 lines
  - Deliverable: `server/src/services/atproto/communities.ts`

- [ ] **T013** Extract membership methods to `server/src/services/atproto/memberships.ts`
  - Extract membership-related methods from original `atproto.ts`:
    - `createMembershipRecord`, `getMembershipRecord`, `updateMembershipRecord`
    - `listMembershipsByUser`, `listMembershipsByCommunity`
  - Import `ATProtoService` from `./base`
  - Expected size: <400 lines
  - Run: `pnpm --filter server typecheck`
  - Verify: File compiles, <400 lines
  - Deliverable: `server/src/services/atproto/memberships.ts`

- [ ] **T014** Extract emoji methods to `server/src/services/atproto/emoji.ts`
  - Extract emoji-related methods from original `atproto.ts`:
    - `uploadCustomEmoji`, `getCustomEmoji`, `listCustomEmojis`
    - `submitEmojiForApproval`, `approveEmoji`, `revokeEmoji`
  - Import `ATProtoService` from `./base`
  - Expected size: <300 lines
  - Run: `pnpm --filter server typecheck`
  - Verify: File compiles, <300 lines
  - Deliverable: `server/src/services/atproto/emoji.ts`

- [ ] **T015** Extract moderation methods to `server/src/services/atproto/moderation.ts`
  - Extract moderation-related methods from original `atproto.ts`:
    - `createModerationAction`, `getModerationAction`, `listModerationActions`
  - Import `ATProtoService` from `./base`
  - Expected size: <300 lines
  - Run: `pnpm --filter server typecheck`
  - Verify: File compiles, <300 lines
  - Deliverable: `server/src/services/atproto/moderation.ts`

- [ ] **T016** Update server route imports to use new `services/atproto/` structure
  - Find usages: `grep -r "from.*services/atproto'" server/src/routes/`
  - Replace: `import { ATProtoService } from '../services/atproto'` → `import { ATProtoService } from '../services/atproto'` (barrel export works)
  - Alternatively use specific imports: `import { createCommunityConfig } from '../services/atproto/communities'`
  - Update Durable Objects imports if needed
  - Run: `pnpm --filter server typecheck`
  - Verify: All server route imports resolve
  - Deliverable: Server routes use new atproto structure

- [ ] **T017** Delete original `server/src/services/atproto.ts`
  - Verify all functionality moved to split files
  - Run: `grep -r "from.*services/atproto'" server/src/ | grep -v "services/atproto/"` (should find none)
  - Delete: `rm /workspaces/atrarium/server/src/services/atproto.ts`
  - Run: `pnpm --filter server typecheck && pnpm --filter server test`
  - Verify: Server compiles and tests pass without original file
  - Deliverable: Original atproto.ts removed, server still functional

## Phase 3.4: Client Refactoring

- [ ] **T018** Create `client/src/lib/hooks/` directory structure (quickstart.md Step 5)
  - Create directory: `mkdir -p /workspaces/atrarium/client/src/lib/hooks`
  - Create barrel export `client/src/lib/hooks/index.ts`:
    ```typescript
    export * from './useCommunities';
    export * from './useMemberships';
    export * from './useModeration';
    ```
  - Verify: Directory and barrel export created
  - Deliverable: `lib/hooks/` scaffold with index.ts

- [ ] **T019** Extract community hooks to `client/src/lib/hooks/useCommunities.ts`
  - Extract from original `client/src/lib/hooks.ts`:
    - `useCommunities`, `useCommunity`, `useCreateCommunity`
    - `useUpdateCommunity`, `useDeleteCommunity`
  - Include TanStack Query imports and query key patterns
  - Expected size: <200 lines
  - Run: `pnpm --filter client typecheck`
  - Verify: File compiles, <200 lines
  - Deliverable: `client/src/lib/hooks/useCommunities.ts`

- [ ] **T020** Extract membership hooks to `client/src/lib/hooks/useMemberships.ts`
  - Extract from original `client/src/lib/hooks.ts`:
    - `useMyMemberships`, `useCommunityMembers`, `useJoinCommunity`
    - `useApproveMembership`, `useRejectMembership`
  - Include TanStack Query imports and query key patterns
  - Expected size: <150 lines
  - Run: `pnpm --filter client typecheck`
  - Verify: File compiles, <150 lines
  - Deliverable: `client/src/lib/hooks/useMemberships.ts`

- [ ] **T021** Extract moderation hooks to `client/src/lib/hooks/useModeration.ts`
  - Extract from original `client/src/lib/hooks.ts`:
    - `useModerationActions`, `useHidePost`, `useUnhidePost`
    - `useBlockUser`, `useUnblockUser`
  - Include TanStack Query imports and query key patterns
  - Expected size: <100 lines
  - Run: `pnpm --filter client typecheck`
  - Verify: File compiles, <100 lines
  - Deliverable: `client/src/lib/hooks/useModeration.ts`

- [ ] **T022** Update client component imports to use new `lib/hooks/` structure
  - Find usages: `grep -r "from.*lib/hooks'" client/src/components/`
  - Option 1: Use barrel export: `import { useCommunities } from '@/lib/hooks'` (unchanged)
  - Option 2: Use specific imports: `import { useCommunities } from '@/lib/hooks/useCommunities'`
  - Run: `pnpm --filter client typecheck`
  - Verify: All component imports resolve
  - Deliverable: Client components use new hooks structure

- [ ] **T023** Delete original `client/src/lib/hooks.ts`
  - Verify all functionality moved to split files
  - Run: `grep -r "from.*lib/hooks'" client/src/ | grep -v "lib/hooks/"` (should find barrel export imports only)
  - Delete: `rm /workspaces/atrarium/client/src/lib/hooks.ts`
  - Run: `pnpm --filter client typecheck && pnpm --filter client test`
  - Verify: Client compiles and tests pass without original file
  - Deliverable: Original hooks.ts removed, client still functional

## Phase 3.5: Documentation Updates

- [ ] **T024** Update server/README.md (quickstart.md Step 9)
  - Append file organization section:
    ```markdown
    ## File Organization

    - `src/services/atproto/` - AT Protocol service (split by domain)
      - `communities.ts` - Community management methods
      - `memberships.ts` - Membership management methods
      - `emoji.ts` - Custom emoji methods
      - `moderation.ts` - Moderation methods
    ```
  - Run: `grep "services/atproto/" server/README.md`
  - Verify: Documentation added
  - Deliverable: Updated `server/README.md`

- [ ] **T025** Update client/README.md (quickstart.md Step 9)
  - Append file organization section:
    ```markdown
    ## File Organization

    - `src/lib/hooks/` - React Query hooks (split by feature)
      - `useCommunities.ts` - Community hooks
      - `useMemberships.ts` - Membership hooks
      - `useModeration.ts` - Moderation hooks
    ```
  - Run: `grep "lib/hooks/" client/README.md`
  - Verify: Documentation added
  - Deliverable: Updated `client/README.md`

- [ ] **T026** Update root README.md with shared utilities (quickstart.md Step 9)
  - Append shared utilities section:
    ```markdown
    ## Shared Utilities

    - `shared/utils/` - Shared utilities across server and client
      - `emoji.ts` - Emoji validation functions
      - `hashtag.ts` - Hashtag generation functions
      - `validation.ts` - Common validation utilities
    ```
  - Run: `grep "shared/utils/" README.md`
  - Verify: Documentation added
  - Deliverable: Updated root `README.md`

## Phase 3.6: Final Validation & Commit

- [ ] **T027** Run full validation suite (refactoring-contract.md POST-001 through POST-008, quickstart.md Step 7-8)
  - TypeScript compilation: `pnpm -r typecheck` (POST-001)
  - Test suite: `pnpm -r test` (POST-002)
  - Linting: `pnpm lint` (POST-003)
  - Formatting: `pnpm format:check` (POST-003)
  - If linting errors: `pnpm lint:fix`
  - If formatting errors: `pnpm format`
  - Verify file structure (POST-004):
    - `ls -la server/src/services/atproto/` (expect: index.ts, base.ts, communities.ts, memberships.ts, emoji.ts, moderation.ts)
    - `ls -la client/src/lib/hooks/` (expect: index.ts, useCommunities.ts, useMemberships.ts, useModeration.ts)
    - `ls -la shared/utils/src/` (expect: emoji.ts, hashtag.ts, validation.ts)
  - Verify import paths (POST-005):
    - `grep -r "from '../services/atproto'" server/src/routes/` (expect: no results or barrel export usage)
    - `grep -r "from '@atrarium/utils'" server/src/ client/src/` (expect: multiple results)
  - Verify line counts (POST-006):
    - `wc -l server/src/services/atproto/*.ts` (all <500 lines)
    - `wc -l client/src/lib/hooks/*.ts` (all <200 lines)
  - Verify duplicate elimination (POST-007):
    - `test ! -f server/src/utils/emoji-validator.ts` (expect: file does not exist)
    - `test ! -f server/src/utils/hashtag.ts` (expect: file does not exist)
    - `test -f shared/utils/src/emoji.ts` (expect: file exists)
    - `test -f shared/utils/src/hashtag.ts` (expect: file exists)
  - Verify documentation (POST-008):
    - `grep "services/atproto/" server/README.md` (expect: match)
    - `grep "lib/hooks/" client/README.md` (expect: match)
    - `grep "shared/utils/" README.md` (expect: match)
  - Expected output: All validations pass
  - If any fail: Fix issues before committing
  - Deliverable: All POST-conditions satisfied

- [ ] **T028** Commit refactoring changes (quickstart.md Step 10)
  - Stage all changes: `git add .`
  - Verify changes: `git status`
  - Pre-commit hooks will run automatically (Biome + TypeScript)
  - Commit message:
    ```
    refactor: reorganize codebase by domain-driven design

    Split large files (>500 lines) into domain-specific modules:
    - server/services/atproto.ts (1606 lines) → atproto/{base,communities,memberships,emoji,moderation}.ts
    - client/lib/hooks.ts (433 lines) → hooks/{useCommunities,useMemberships,useModeration}.ts

    Consolidate duplicate utilities:
    - Moved emoji/hashtag validation to shared/utils/

    Cleanup orphaned files:
    - Removed client/@/ directory (path alias confusion)

    Breaking changes:
    - Updated import paths across server and client
    - Git history loss accepted per spec clarification

    Validation:
    - pnpm -r typecheck: PASS
    - pnpm -r test: PASS
    - pnpm lint: PASS

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    ```
  - Run: `git commit` (message via editor or `-m` flag)
  - Verify: Commit created successfully, pre-commit hooks passed
  - Deliverable: Atomic commit with all refactoring changes

## Dependencies

Sequential execution required (no parallel tasks):
- **Preparation** (T001-T004) before all other tasks
- **Shared Utilities** (T005-T009) before server/client refactoring (to enable @atrarium/utils imports)
- **Server Refactoring** (T010-T017) depends on shared utilities
- **Client Refactoring** (T018-T023) depends on shared utilities
- **Documentation** (T024-T026) can run after server/client complete
- **Final Validation** (T027-T028) must be last (validates all changes)

**Specific dependencies**:
- T005 (create workspace) blocks T006-T009 (consolidate utilities)
- T010 (create directory) blocks T011-T015 (split files)
- T011-T015 (split files) blocks T016 (update imports)
- T016 (update imports) blocks T017 (delete original)
- T018 (create directory) blocks T019-T021 (extract hooks)
- T019-T021 (extract hooks) blocks T022 (update imports)
- T022 (update imports) blocks T023 (delete original)
- T001-T026 block T027 (validation)
- T027 (validation passing) blocks T028 (commit)

## Notes

- **No parallel execution**: Refactoring requires incremental validation (each step must pass TypeScript compilation before proceeding)
- **Commit strategy**: Single atomic commit after all tasks complete (T028)
- **Git history**: Loss accepted per clarification (no `git mv` required)
- **Breaking changes**: Allowed for internal code (no backward compatibility requirement)
- **Rollback**: If validation fails, use `git reset --hard HEAD` or restore from backup branch

## Validation Checklist

- [x] All quickstart steps (1-10) covered in tasks
- [x] All POST-conditions (001-008) mapped to validation tasks
- [x] All entities (6 from data-model.md) addressed
- [x] Orphaned file cleanup (Entity 4) included (T004)
- [x] Shared utilities consolidation (Entity 3) included (T005-T009)
- [x] Server refactoring (Entity 6) included (T010-T017)
- [x] Client refactoring (Entity 6) included (T018-T023)
- [x] Documentation updates (FR-010) included (T024-T026)
- [x] Full validation suite (FR-008, FR-009) included (T027)

## Completion Criteria (Constitution Principle 10)

Each task MUST be fully completed before being marked as done:
- [x] All file splits complete (no partial/MVP splits)
- [x] All imports updated (no TODO comments for import fixes)
- [x] All validation passing (not deferred)
- [x] All documentation updated (not placeholders)
- [x] No "Phase 2" or "Future Enhancement" deferrals

**Prohibited Patterns**:
- ❌ "MVP split - full refactoring in Phase 2"
- ❌ "TODO: Update remaining imports later"
- ❌ "Placeholder barrel export - complete exports pending"
- ❌ Marking task complete while TypeScript errors remain

---

**Total Tasks**: 28
**Estimated Completion**: Single refactoring session (sequential execution, ~4-6 hours)
**Success Indicator**: `pnpm -r typecheck && pnpm -r test && pnpm lint && echo "✅ SUCCESS"`
