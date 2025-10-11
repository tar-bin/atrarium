# Tasks: Hierarchical Group System

**Feature**: 017-1-1 (Hierarchical Group System)
**Input**: Design documents from `/workspaces/atrarium/specs/017-1-1/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/hierarchy-api.md, quickstart.md

---

## Execution Flow
```
1. ✅ Load plan.md → Tech stack: TypeScript 5.7, Hono, React 19, TanStack, Zod
2. ✅ Load data-model.md → 3 entities: Group, Membership, Stage (reuse existing schemas)
3. ✅ Load contracts/ → 6 new endpoints + 1 extended endpoint
4. ✅ Generate tasks by category (Setup → Tests → Core → Integration → Polish)
5. ✅ Apply TDD order (tests before implementation)
6. ✅ Mark [P] for parallel execution (different files, no dependencies)
7. ✅ Number sequentially (T001-T037)
```

---

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Includes exact file paths in descriptions
- **Project Structure**: Web app (backend: `server/`, frontend: `client/`)

---

## Phase 3.1: Setup & Validation

- [ ] **T001** Validate branch 017-1-1 is checked out and clean
- [ ] **T002 [P]** Run TypeScript type checks across all workspaces (`pnpm -r typecheck`)
- [ ] **T003 [P]** Run Biome linting and formatting checks (`pnpm lint`, `pnpm format:check`)
- [ ] **T004 [P]** Verify existing Lexicon schema `net.atrarium.group.config` includes `parentGroup` field (no schema changes needed)
- [ ] **T005 [P]** Verify Durable Objects Storage infrastructure exists (no new databases per Principle 8)

---

## Phase 3.2: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests (server/tests/contract/)

- [ ] **T006 [P]** Contract test `groups.createChild` endpoint in `server/tests/contract/hierarchy/create-child.test.ts`
  - Input: `{ parentId, name, description?, feedMix? }`
  - Expected: 200 OK with child group (stage='theme', parentGroup=parent AT-URI)
  - Errors: 400 (invalid input), 403 (not owner), 409 (parent not Graduated)

- [ ] **T007 [P]** Contract test `groups.upgradeStage` endpoint in `server/tests/contract/hierarchy/upgrade-stage.test.ts`
  - Input: `{ groupId, targetStage: 'community' | 'graduated' }`
  - Expected: 200 OK with updated stage
  - Errors: 400 (invalid transition), 403 (not owner), 409 (member count < threshold)

- [ ] **T008 [P]** Contract test `groups.downgradeStage` endpoint in `server/tests/contract/hierarchy/downgrade-stage.test.ts`
  - Input: `{ groupId, targetStage: 'theme' | 'community' }`
  - Expected: 200 OK with downgraded stage
  - Errors: 400 (invalid transition), 403 (not owner)

- [ ] **T009 [P]** Contract test `groups.listChildren` endpoint in `server/tests/contract/hierarchy/list-children.test.ts`
  - Input: `{ parentId, limit?, cursor? }`
  - Expected: 200 OK with children array (all stage='theme'), cursor for pagination
  - Errors: 404 (parent not found)

- [ ] **T010 [P]** Contract test `groups.getParent` endpoint in `server/tests/contract/hierarchy/get-parent.test.ts`
  - Input: `{ childId }`
  - Expected: 200 OK with parent group (stage='graduated') or null
  - Errors: 404 (child not found)

- [ ] **T011 [P]** Contract test `groups.delete` with children blocking in `server/tests/contract/hierarchy/delete-blocking.test.ts`
  - Setup: Create Graduated parent with child themes
  - Expected: 409 Conflict "Cannot delete group with N active children"
  - Verify: Deletion succeeds after children removed

---

## Phase 3.3: Backend Schema & Validation ⚠️ Tests from 3.2 MUST BE FAILING

### Schema Extensions (server/src/schemas/)

- [ ] **T012 [P]** Add stage validation rules in `server/src/schemas/validation.ts`
  - Dunbar thresholds: Theme→Community (15), Community→Graduated (50)
  - Stage transition matrix (Theme→Community, Community→Graduated, bidirectional downgrades)
  - Parent-child stage rules (only Graduated can be parent, only Theme can have parent)

- [ ] **T013 [P]** Add parent-child validation schemas in `server/src/schemas/validation.ts`
  - `CreateChildInputSchema` (parentId, name, description?, feedMix?)
  - `UpgradeStageInputSchema` (groupId, targetStage)
  - `DowngradeStageInputSchema` (groupId, targetStage)
  - `ListChildrenInputSchema` (parentId, limit, cursor)
  - `GetParentInputSchema` (childId)

- [ ] **T014 [P]** Add hierarchy validation helpers in `server/src/schemas/validation.ts`
  - `validateParentStage(parent: Group)` → assert parent.stage === 'graduated'
  - `validateMemberCountForUpgrade(memberCount: number, targetStage: Stage)` → check Dunbar thresholds
  - `validateStageTransition(fromStage: Stage, toStage: Stage)` → check transition matrix

---

## Phase 3.4: PDS Service Extensions

### AT Protocol Client Methods (server/src/services/atproto.ts)

- [ ] **T015** Add `createChildCommunity(parentId, input)` method in `server/src/services/atproto.ts`
  - Validates parent is Graduated stage
  - Creates `net.atrarium.group.config` record with `parentGroup: parentAtUri`
  - Sets child stage to 'theme' (always)
  - Returns child group with parent reference

- [ ] **T016** Add `upgradeStage(groupId, targetStage)` method in `server/src/services/atproto.ts`
  - Queries member count via `getMemberCount(groupId)`
  - Validates Dunbar threshold met
  - Updates `net.atrarium.group.config` record with new stage
  - Returns updated group

- [ ] **T017** Add `downgradeStage(groupId, targetStage)` method in `server/src/services/atproto.ts`
  - Validates stage transition (Graduated→Community→Theme)
  - Updates `net.atrarium.group.config` record with lower stage
  - Returns updated group

- [ ] **T018** Add `getMemberCount(groupId)` method in `server/src/services/atproto.ts`
  - Queries PDS: `SELECT COUNT(*) FROM net.atrarium.group.membership WHERE group = ? AND active = true`
  - Returns active member count for Dunbar threshold checks

- [ ] **T019** Add `listChildrenFromPDS(parentId)` method in `server/src/services/atproto.ts`
  - Queries PDS: `SELECT * FROM net.atrarium.group.config WHERE parentGroup = ?`
  - Returns array of child groups (all should be stage='theme')

- [ ] **T020** Extend `deleteCommunity(groupId)` method in `server/src/services/atproto.ts`
  - NEW: Check for children via `listChildrenFromPDS(groupId)`
  - NEW: Throw ConflictError if children.length > 0 with child names
  - Existing: Delete `net.atrarium.group.config` record if no children

---

## Phase 3.5: Durable Objects Extensions

### GroupFeedGenerator Extensions (server/src/durable-objects/group-feed-generator.ts)

- [ ] **T021** Add parent/children cache keys to GroupFeedGenerator storage schema
  - `parent:<groupId>` → stores parent AT-URI (string | undefined)
  - `children:<parentId>` → stores child IDs array (string[])
  - Updates via Firehose indexing when parentGroup field detected

- [ ] **T022** Add `listChildren()` RPC method to GroupFeedGenerator
  - Reads `children:<groupId>` from Durable Objects Storage
  - Returns child group configs (fetches via `config:<childId>` keys)
  - Used by API to fast-query children without PDS roundtrip

- [ ] **T023** Add `getParent()` RPC method to GroupFeedGenerator
  - Reads `parent:<groupId>` from Durable Objects Storage
  - Fetches parent group config if parentUri exists
  - Returns parent or null

- [ ] **T024** Extend `getFeedSkeleton()` to aggregate child posts for Graduated parents
  - If group.stage === 'graduated', query posts from self + all children
  - Reads `children:<groupId>` → queries `post:*` for each child
  - Merges posts by timestamp, returns newest-first (respects feedMix ratios)

- [ ] **T025** Add moderation inheritance logic for Theme groups
  - When moderating Theme-stage group, check if moderator belongs to parent Graduated group
  - Reads `parent:<groupId>` → fetches parent.moderators + parent.owner
  - Allows parent owner/moderators to moderate child themes

---

## Phase 3.6: Firehose Processor Updates

### Hierarchy Validation (server/src/workers/firehose-processor.ts)

- [ ] **T026** Add parent ancestry validation in FirehoseProcessor
  - When indexing `net.atrarium.group.config` record with `parentGroup` field:
    - Validate parent exists and is Graduated stage
    - Validate no circular references (parent.parentGroup === undefined)
    - Validate max depth = 1 (no grandchildren)
  - Reject invalid records (exclude from Durable Objects Storage)

- [ ] **T027** Update Firehose indexing to populate parent/children cache keys
  - On config record create: Write `parent:<childId>` → parentUri
  - On config record create: Append childId to parent's `children:<parentId>` array
  - On config record delete: Remove childId from parent's `children:<parentId>` array

---

## Phase 3.7: API Route Handlers

### Communities Router Extensions (server/src/routes/groups.ts)

- [ ] **T028** Implement `groups.createChild` handler
  - Validates JWT auth (owner of parent only)
  - Calls `atproto.createChildCommunity(parentId, input)`
  - Returns child group response
  - File: `server/src/routes/groups.ts`

- [ ] **T029** Implement `groups.upgradeStage` handler
  - Validates JWT auth (owner only)
  - Calls `atproto.upgradeStage(groupId, targetStage)`
  - Returns updated group response
  - File: `server/src/routes/groups.ts`

- [ ] **T030** Implement `groups.downgradeStage` handler
  - Validates JWT auth (owner only)
  - Calls `atproto.downgradeStage(groupId, targetStage)`
  - Returns downgraded group response
  - File: `server/src/routes/groups.ts`

- [ ] **T031** Implement `groups.listChildren` handler
  - Calls GroupFeedGenerator DO `listChildren()` RPC
  - Returns children array with pagination cursor
  - File: `server/src/routes/groups.ts`

- [ ] **T032** Implement `groups.getParent` handler
  - Calls GroupFeedGenerator DO `getParent()` RPC
  - Returns parent group or null
  - File: `server/src/routes/groups.ts`

- [ ] **T033** Extend `groups.delete` handler with children blocking
  - Calls `atproto.deleteCommunity(groupId)` (includes children check)
  - Returns 409 Conflict if children exist (with child names in error message)
  - Returns 200 OK with deletedId if deletion succeeds
  - File: `server/src/routes/groups.ts`

---

## Phase 3.8: oRPC Contract Extensions

### Shared Contracts (shared/contracts/src/)

- [ ] **T034 [P]** Add hierarchy endpoint contracts to `shared/contracts/src/router.ts`
  - `groups.createChild: contract.input(CreateChildInputSchema).output(GroupResponseSchema)`
  - `groups.upgradeStage: contract.input(UpgradeStageInputSchema).output(GroupResponseSchema)`
  - `groups.downgradeStage: contract.input(DowngradeStageInputSchema).output(GroupResponseSchema)`
  - `groups.listChildren: contract.input(ListChildrenInputSchema).output(ListChildrenResponseSchema)`
  - `groups.getParent: contract.input(GetParentInputSchema).output(z.union([GroupResponseSchema, z.null()]))`

- [ ] **T035 [P]** Add hierarchy validation schemas to `shared/contracts/src/schemas.ts`
  - `CreateChildInputSchema`, `UpgradeStageInputSchema`, `DowngradeStageInputSchema`
  - `ListChildrenInputSchema`, `GetParentInputSchema`
  - `ListChildrenResponseSchema` (with children array + cursor)
  - Export from `shared/contracts/src/index.ts`

---

## Phase 3.9: Frontend Components

### Hierarchy UI Components (client/src/components/groups/)

- [ ] **T036 [P]** Create `GroupHierarchy.tsx` component in `client/src/components/groups/`
  - Displays parent-child tree view using Radix UI Accordion
  - Shows "Parent: [Name]" link for child themes
  - Shows "Child Themes (N)" collapsible list for Graduated groups
  - Uses TanStack Query `useQuery(['group', id, 'children'])`

- [ ] **T037 [P]** Create `StageUpgradeButton.tsx` component in `client/src/components/groups/`
  - Displays upgrade button when member count >= Dunbar threshold
  - Shows threshold progress: "15 / ~15 (eligible for Group)" or "50 / ~50 (eligible for Graduated)"
  - Calls `apiClient.groups.upgradeStage({ groupId, targetStage })`
  - Uses TanStack Mutation with optimistic updates

- [ ] **T038 [P]** Create `CreateChildTheme.tsx` component in `client/src/components/groups/`
  - Form for creating child theme (name, description, feedMix)
  - Only visible when current group.stage === 'graduated'
  - Calls `apiClient.groups.createChild({ parentId, ...input })`
  - Invalidates children query on success

- [ ] **T039 [P]** Create `StageDowngradeButton.tsx` component in `client/src/components/groups/`
  - Allows downgrading Graduated→Community→Theme
  - Shows warning: "Downgrading will disable child creation" (for Graduated→Community)
  - Calls `apiClient.groups.downgradeStage({ groupId, targetStage })`
  - Uses TanStack Mutation

- [ ] **T040 [P]** Update `CommunityDetail.tsx` to display hierarchy info
  - Integrates `GroupHierarchy` component
  - Shows parent link if `group.parentGroup` exists
  - Shows children list if `group.stage === 'graduated'`
  - File: `client/src/components/groups/CommunityDetail.tsx`

---

## Phase 3.10: Frontend Routes

### Hierarchy Routes (client/src/routes/groups/)

- [ ] **T041 [P]** Create `$id.children.tsx` route in `client/src/routes/groups/`
  - Displays children list for Graduated group
  - Uses TanStack Query `useQuery(['group', id, 'children'])`
  - Filterable/sortable table using TanStack Table
  - Breadcrumb: "Communities > [Parent Name] > Child Themes"

- [ ] **T042 [P]** Update group detail route to show parent navigation in `client/src/routes/groups/$id.tsx`
  - Adds "Part of: [Parent Name]" link if `parentGroup` exists
  - Calls `apiClient.groups.getParent({ childId })` to fetch parent
  - Updates breadcrumb: "Communities > [Parent Name] > [Current Name]"

---

## Phase 3.11: Frontend API Integration

### API Client Extensions (client/src/lib/api.ts)

- [ ] **T043** Add hierarchy API methods to `client/src/lib/api.ts`
  - Type-safe wrappers for oRPC hierarchy endpoints:
    - `createChild(parentId, input)`
    - `upgradeStage(groupId, targetStage)`
    - `downgradeStage(groupId, targetStage)`
    - `listChildren(parentId, limit, cursor)`
    - `getParent(childId)`
  - Uses `apiClient.groups.*` with TypeScript inference from `@atrarium/contracts`

---

## Phase 3.12: Integration Tests

### End-to-End Hierarchy Flows (server/tests/integration/)

- [ ] **T044 [P]** Integration test: Create Theme → Upgrade → Create children in `server/tests/integration/hierarchy/graduated-parent-flow.test.ts`
  - Alice creates Theme "Design Patterns" (0 members)
  - Add 15 members → upgrade to Group
  - Add 35 more members (50 total) → upgrade to Graduated
  - Create 3 child themes ("UI", "API", "Database")
  - Verify all children have stage='theme' and parentGroup=parent AT-URI

- [ ] **T045 [P]** Integration test: Moderation inheritance (Theme uses parent's) in `server/tests/integration/hierarchy/moderation-inheritance.test.ts`
  - Alice (owner of Graduated parent) moderates post in child Theme
  - Bob (member of child Theme) cannot moderate
  - Verify Alice can hide/unhide posts in child despite not being child owner

- [ ] **T046 [P]** Integration test: Deletion blocking in `server/tests/integration/hierarchy/deletion-blocking.test.ts`
  - Create Graduated parent with 2 child themes
  - Attempt to delete parent → 409 Conflict
  - Delete both children → deletion succeeds
  - Verify parent deleted from PDS and Durable Objects

- [ ] **T047 [P]** Integration test: Stage downgrade with children in `server/tests/integration/hierarchy/downgrade-with-children.test.ts`
  - Create Graduated parent with children
  - Downgrade to Group → success
  - Verify children still exist but parent cannot create new children
  - Verify parentGroup reference remains (immutable)

- [ ] **T048 [P]** Integration test: Feed aggregation (parent shows child posts) in `server/tests/integration/hierarchy/feed-aggregation.test.ts`
  - Bob posts to child Theme "UI Patterns"
  - Query parent Graduated feed → includes Bob's post
  - Verify post tagged with child hashtag but appears in parent feed

---

## Phase 3.13: Unit Tests

### Stage Validation Logic (server/tests/unit/)

- [ ] **T049 [P]** Unit test: Dunbar threshold validation in `server/tests/unit/stage-validation.test.ts`
  - Theme with 14 members → cannot upgrade to Group
  - Theme with 15 members → can upgrade to Group
  - Group with 49 members → cannot upgrade to Graduated
  - Group with 50 members → can upgrade to Graduated

- [ ] **T050 [P]** Unit test: Stage transition matrix in `server/tests/unit/stage-validation.test.ts`
  - Theme→Community (valid), Theme→Graduated (invalid)
  - Community→Graduated (valid), Group→Theme (valid downgrade)
  - Graduated→Community (valid), Graduated→Theme (valid downgrade)

- [ ] **T051 [P]** Unit test: Parent-child stage rules in `server/tests/unit/stage-validation.test.ts`
  - Only Graduated can be parent (Group as parent → invalid)
  - Only Theme can have parent (Group with parent → invalid)
  - Group cannot have or be parent

---

## Phase 3.14: Frontend Component Tests

### Hierarchy UI Tests (client/tests/components/)

- [ ] **T052 [P]** Component test: `GroupHierarchy.tsx` in `client/tests/components/hierarchy.test.tsx`
  - Renders parent link for child theme
  - Renders children list for Graduated parent
  - Navigates to parent/child on click

- [ ] **T053 [P]** Component test: `StageUpgradeButton.tsx` in `client/tests/components/stage-upgrade.test.tsx`
  - Button hidden when memberCount < threshold
  - Button visible when memberCount >= threshold
  - Calls `upgradeStage` API on click

- [ ] **T054 [P]** Component test: `CreateChildTheme.tsx` in `client/tests/components/create-child.test.tsx`
  - Form only visible when group.stage === 'graduated'
  - Validates input (name required)
  - Calls `createChild` API on submit

---

## Phase 3.15: Quickstart Validation

### Manual Testing Scenario (based on quickstart.md)

- [ ] **T055** Run quickstart.md validation end-to-end
  - Start dev environment (`./start-dev.sh all`)
  - Load test data (`./scripts/load-test-data.sh`)
  - Execute all 10 quickstart steps (create, upgrade, children, moderation, deletion)
  - Verify all acceptance criteria from spec.md passed
  - Document any deviations in `specs/017-1-1/quickstart-results.md`

---

## Phase 3.16: Polish & Documentation

- [ ] **T056 [P]** Run Biome linting and fix all issues (`pnpm lint:fix`)
- [ ] **T057 [P]** Run Biome formatting and fix all issues (`pnpm format`)
- [ ] **T058 [P]** Run TypeScript type checks and fix all errors (`pnpm -r typecheck`)
- [ ] **T059 [P]** Update `CHANGELOG.md` with hierarchy feature entry
- [ ] **T060** Final validation: Run all tests (`pnpm -r test`)
  - Server contract tests (T006-T011)
  - Server integration tests (T044-T048)
  - Server unit tests (T049-T051)
  - Client component tests (T052-T054)
- [ ] **T061** Performance validation: Verify <200ms p95 API response time for hierarchy endpoints
- [ ] **T062** Update `specs/017-1-1/plan.md` Progress Tracking → mark Phase 3-5 complete

---

## Dependencies

**Setup Phase (T001-T005)**:
- Must complete before all other tasks

**Contract Tests (T006-T011)**:
- Must complete before implementation tasks (T012-T043)
- Can run in parallel [P] (different test files)

**Backend Schema (T012-T014)**:
- Blocks: T015-T020 (PDS methods depend on validation schemas)
- Can run in parallel [P] (same file, but logically independent)

**PDS Service (T015-T020)**:
- Depends on: T012-T014 (validation schemas)
- Blocks: T028-T033 (API handlers depend on PDS methods)
- Sequential (same file: atproto.ts)

**Durable Objects (T021-T025)**:
- Depends on: T012-T014 (validation schemas)
- Blocks: T028-T033 (API handlers use DO RPC methods)
- Sequential (same file: group-feed-generator.ts)

**Firehose Processor (T026-T027)**:
- Depends on: T012-T014 (validation logic)
- Blocks: T044-T048 (integration tests rely on Firehose indexing)
- Sequential (same file: firehose-processor.ts)

**API Handlers (T028-T033)**:
- Depends on: T015-T020 (PDS methods), T021-T025 (DO methods)
- Sequential (same file: groups.ts)

**oRPC Contracts (T034-T035)**:
- Can run in parallel with backend implementation [P]
- Blocks: T043 (frontend API client needs types)

**Frontend Components (T036-T040)**:
- Depends on: T043 (API client integration)
- Can run in parallel [P] (different component files)

**Frontend Routes (T041-T042)**:
- Depends on: T036-T040 (hierarchy components)
- Can run in parallel [P] (different route files)

**Integration Tests (T044-T048)**:
- Depends on: Full backend + frontend implementation (T028-T043)
- Can run in parallel [P] (different test files)

**Unit Tests (T049-T054)**:
- Can run in parallel with implementation [P]
- Tests individual functions/components

**Polish (T056-T062)**:
- Depends on: All implementation + tests complete
- T056-T058 can run in parallel [P]
- T060-T062 sequential (validation depends on code quality)

---

## Parallel Execution Examples

### Example 1: Contract Tests (after T005)
```bash
# Launch T006-T011 in parallel (6 independent test files)
Task: "Contract test groups.createChild in server/tests/contract/hierarchy/create-child.test.ts"
Task: "Contract test groups.upgradeStage in server/tests/contract/hierarchy/upgrade-stage.test.ts"
Task: "Contract test groups.downgradeStage in server/tests/contract/hierarchy/downgrade-stage.test.ts"
Task: "Contract test groups.listChildren in server/tests/contract/hierarchy/list-children.test.ts"
Task: "Contract test groups.getParent in server/tests/contract/hierarchy/get-parent.test.ts"
Task: "Contract test groups.delete blocking in server/tests/contract/hierarchy/delete-blocking.test.ts"
```

### Example 2: Frontend Components (after T043)
```bash
# Launch T036-T040 in parallel (5 independent component files)
Task: "Create GroupHierarchy.tsx in client/src/components/groups/"
Task: "Create StageUpgradeButton.tsx in client/src/components/groups/"
Task: "Create CreateChildTheme.tsx in client/src/components/groups/"
Task: "Create StageDowngradeButton.tsx in client/src/components/groups/"
Task: "Update CommunityDetail.tsx in client/src/components/groups/"
```

### Example 3: Integration Tests (after T043)
```bash
# Launch T044-T048 in parallel (5 independent test scenarios)
Task: "Integration test Graduated parent flow in server/tests/integration/hierarchy/graduated-parent-flow.test.ts"
Task: "Integration test moderation inheritance in server/tests/integration/hierarchy/moderation-inheritance.test.ts"
Task: "Integration test deletion blocking in server/tests/integration/hierarchy/deletion-blocking.test.ts"
Task: "Integration test downgrade with children in server/tests/integration/hierarchy/downgrade-with-children.test.ts"
Task: "Integration test feed aggregation in server/tests/integration/hierarchy/feed-aggregation.test.ts"
```

---

## Notes

- **[P] Marker**: Different files, no dependencies → safe to parallelize
- **TDD Critical**: Tests (T006-T011) MUST fail before implementation starts
- **Constitution Principle 8**: All storage via PDS + Durable Objects (no new databases)
- **Commit Frequently**: After each task completion
- **Avoid**: Same file conflicts (e.g., multiple tasks editing `groups.ts` simultaneously)

---

## Validation Checklist

- [x] All contracts have corresponding tests (T006-T011 cover 6 endpoints)
- [x] All entities verified (reuse existing Group, Membership, Stage schemas)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent ([P] tasks in different files)
- [x] Each task specifies exact file path (e.g., `server/src/routes/groups.ts`)
- [x] No same-file conflicts (PDS methods sequential in atproto.ts, API handlers sequential in groups.ts)

---

## Completion Criteria (Constitution Principle 10)

**Each task MUST be fully completed**:
- ✅ All functionality in task description implemented (no partial/MVP)
- ✅ All error handling implemented (no TODO comments)
- ✅ All validation logic implemented (no deferrals)
- ✅ All UI components fully functional (no placeholders)
- ✅ All API endpoints implemented and tested (no mocks)
- ✅ No "Phase 2" or "Future Enhancement" comments
- ✅ Integration tests passing (not skipped)

**Acceptable Deferrals** (tracked as separate tasks):
- Performance optimizations (if core functionality works)
- Non-critical edge cases (explicitly documented)
- Features scoped out of spec.md

**Prohibited Patterns**:
- ❌ "MVP implementation - full version later"
- ❌ "TODO: Complete this functionality"
- ❌ "Placeholder UI - design pending"
- ❌ Marking task complete with skipped/mocked tests

---

**Total Tasks**: 62 (T001-T062)
**Estimated Parallel Groups**: 10 (Setup, Contract Tests, Components, Routes, Integration Tests, Unit Tests, etc.)
**Critical Path**: Setup → Contract Tests → Backend Schema → PDS/DO/Firehose → API Handlers → Frontend → Integration → Polish

**Ready for Execution** - Proceed with T001 or `/implement` command.
