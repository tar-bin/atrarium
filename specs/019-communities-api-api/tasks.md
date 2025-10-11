# Tasks: Complete Communities API Implementation

**Feature**: 019-communities-api-api
**Input**: Design documents from `/workspaces/atrarium/specs/019-communities-api-api/`
**Prerequisites**: [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

## Execution Flow (main)

1. ✅ Load plan.md from feature directory
2. ✅ Load design documents (research.md, data-model.md, contracts/, quickstart.md)
3. ✅ Generate tasks by category (Infrastructure → Tests → Implementation → Validation)
4. ✅ Apply task rules (TDD, parallel execution markers)
5. ✅ Number tasks sequentially (T001-T026)
6. ✅ Generate dependency graph
7. ✅ Create parallel execution examples
8. ✅ Validate task completeness

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Monorepo**: `shared/contracts/`, `server/`, `client/` (pnpm workspaces)
- **Server**: `/workspaces/atrarium/server/src/` (TypeScript, Cloudflare Workers)
- **Tests**: `/workspaces/atrarium/server/tests/` (Vitest + @cloudflare/vitest-pool-workers)
- **Contracts**: `/workspaces/atrarium/shared/contracts/src/` (oRPC contracts, Zod schemas)

---

## Phase 3.1: Infrastructure (ATProtoService PDS Methods)

**Dependencies**: None (can start immediately)
**Parallel**: All tasks in this phase can run in parallel [P]

- [X] **T001 [P]** Add `getCommunityStats` method to `/workspaces/atrarium/server/src/services/atproto.ts`
  - **Purpose**: Query PDS for member count aggregation (used for stage transition validation)
  - **Input**: `communityUri: string` (AT-URI of community config)
  - **Output**: `{ memberCount: number, activeMemberCount: number, pendingMemberCount: number }`
  - **Implementation**: Query `net.atrarium.group.membership` records where `community === communityUri`
  - **Validation**: Count where `active === true` and `status === 'active'`
  - **Error Handling**: Return 0 counts if no memberships found
  - **Test**: Unit test in `/workspaces/atrarium/server/tests/unit/atproto-stats.test.ts`

- [X] **T002 [P]** Add `getCommunityChildren` method to `/workspaces/atrarium/server/src/services/atproto.ts`
  - **Purpose**: Query PDS for child communities (used for listChildren endpoint)
  - **Input**: `parentUri: string` (AT-URI of parent community)
  - **Output**: `Array<{ uri: string, name: string, stage: string, createdAt: string }>`
  - **Implementation**: Query `net.atrarium.group.config` records where `parentGroup === parentUri`
  - **Sorting**: Order by `createdAt` descending (newest first)
  - **Pagination**: Support `limit` and `cursor` parameters
  - **Error Handling**: Return empty array if no children found
  - **Test**: Unit test in `/workspaces/atrarium/server/tests/unit/atproto-children.test.ts`

- [X] **T003 [P]** Add `validateCircularReference` method to `/workspaces/atrarium/server/src/services/atproto.ts`
  - **Purpose**: Prevent circular parent-child relationships (A→B→C→A invalid)
  - **Input**: `childUri: string, parentUri: string`
  - **Output**: `{ isValid: boolean, error?: string }`
  - **Implementation**: Traverse parent hierarchy up to 10 levels, detect if `childUri` appears
  - **Algorithm**: BFS from `parentUri`, check if `childUri` is ancestor
  - **Optimization**: Cache hierarchy in memory during validation
  - **Error Handling**: Throw `BAD_REQUEST` error if circular reference detected
  - **Test**: Unit test in `/workspaces/atrarium/server/tests/unit/atproto-circular.test.ts`

---

## Phase 3.2: Durable Object Extensions

**Dependencies**: None (independent of Phase 3.1, but uses ATProtoService at runtime)
**Parallel**: Sequential (all modify `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`)

- [X] **T004** Add `checkMembership` RPC endpoint to `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`
  - **Purpose**: Fast membership check for hierarchy permission validation
  - **Route**: `GET https://internal/checkMembership?did={userDid}`
  - **Implementation**: Query Durable Object Storage `member:{did}` key
  - **Response**: `{ isMember: boolean, role?: 'owner' | 'moderator' | 'member' }`
  - **Caching**: Use existing member cache (7-day TTL)
  - **Fallback**: If cache miss, query PDS via ATProtoService
  - **Error Handling**: Return `{ isMember: false }` on errors

- [X] **T005** Add `getHierarchy` RPC endpoint to `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`
  - **Purpose**: Fast parent-child relationship lookup for feed generation
  - **Route**: `GET https://internal/hierarchy?communityId={id}`
  - **Implementation**: Query Durable Object Storage `hierarchy:{communityId}` key
  - **Response**: `{ parentUri?: string, children: string[] }`
  - **Caching**: Cache hierarchy relationships for 7 days
  - **Invalidation**: Update cache on PDS writes (via Firehose)
  - **Fallback**: If cache miss, query PDS via ATProtoService

- [X] **T006** Add `validateStageTransition` RPC endpoint to `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`
  - **Purpose**: Stage upgrade/downgrade validation with member count checks
  - **Route**: `POST https://internal/validateStageTransition`
  - **Body**: `{ currentStage: string, targetStage: string, memberCount: number }`
  - **Validation Rules**:
    - theme → community: requires 10+ active members
    - community → graduated: requires 50+ active members
    - graduated → community: requires 0 children
    - Cannot skip stages (theme → graduated invalid)
  - **Response**: `{ isValid: boolean, error?: string, requiredMembers?: number }`
  - **Error Handling**: Return validation error with clear message

---

## Phase 3.3: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE 3.4

**CRITICAL: These tests MUST be written and MUST FAIL before ANY router handler implementation**

**Dependencies**: T001-T006 (need infrastructure methods for test setup)
**Parallel**: All tasks in this phase can run in parallel [P] (different test files)

- [X] **T007 [P]** Contract test `createChild` in `/workspaces/atrarium/server/tests/contract/communities/create-child.test.ts` (implementation includes tests)
  - **Test Cases**:
    1. Valid child creation (graduated parent, authenticated owner) → 200 OK
    2. Non-graduated parent → 400 BAD_REQUEST ("Only graduated communities can have children")
    3. Non-owner authenticated → 403 FORBIDDEN ("Only parent owner can create children")
    4. Invalid feed mix (doesn't sum to 100) → 400 BAD_REQUEST
    5. Parent not found → 404 NOT_FOUND
  - **Setup**: Create graduated parent community, authenticate as owner
  - **Assertions**: Response schema matches `GroupResponseSchema`, `stage === 'theme'`, `parentGroup` set
  - **Expected**: ALL tests FAIL until T013 implemented

- [X] **T008 [P]** Contract test `upgradeStage` in `/workspaces/atrarium/server/tests/contract/communities/upgrade-stage.test.ts`
  - **Test Cases**:
    1. Valid upgrade theme → community (10+ members) → 200 OK
    2. Valid upgrade community → graduated (50+ members) → 200 OK
    3. Insufficient members → 400 BAD_REQUEST ("Community has X members, requires Y")
    4. Skip stage (theme → graduated) → 400 BAD_REQUEST ("Cannot skip stages")
    5. Non-owner authenticated → 403 FORBIDDEN
  - **Setup**: Create community with varying member counts
  - **Assertions**: Response schema matches `GroupResponseSchema`, `stage` updated, `updatedAt` set
  - **Expected**: ALL tests FAIL until T014 implemented

- [X] **T009 [P]** Contract test `downgradeStage` in `/workspaces/atrarium/server/tests/contract/communities/downgrade-stage.test.ts`
  - **Test Cases**:
    1. Valid downgrade community → theme → 200 OK
    2. Graduated with children → 409 CONFLICT ("Cannot downgrade community with active children")
    3. Skip stage (graduated → theme) → 400 BAD_REQUEST
    4. Non-owner authenticated → 403 FORBIDDEN
  - **Setup**: Create communities at various stages, add children for conflict tests
  - **Assertions**: Response schema matches `GroupResponseSchema`, `stage` downgraded, data preserved
  - **Expected**: ALL tests FAIL until T015 implemented

- [X] **T010 [P]** Contract test `listChildren` in `/workspaces/atrarium/server/tests/contract/communities/list-children.test.ts`
  - **Test Cases**:
    1. List children (graduated parent with 3 children) → 200 OK
    2. Pagination (limit=2) → 200 OK with cursor
    3. Empty list (no children) → 200 OK with empty array
    4. Parent not found → 404 NOT_FOUND
  - **Setup**: Create graduated parent with multiple children
  - **Assertions**: Response schema matches `ListChildrenResponseSchema`, sorted by `createdAt` desc
  - **Expected**: ALL tests FAIL until T016 implemented

- [X] **T011 [P]** Contract test `getParent` in `/workspaces/atrarium/server/tests/contract/communities/get-parent.test.ts`
  - **Test Cases**:
    1. Get parent (child with parent) → 200 OK
    2. No parent (top-level community) → 200 OK with null
    3. Child not found → 404 NOT_FOUND
  - **Setup**: Create parent-child relationship
  - **Assertions**: Response schema matches `GroupResponseSchema | null`, parent is graduated
  - **Expected**: ALL tests FAIL until T017 implemented

- [X] **T012 [P]** Contract test `delete` in `/workspaces/atrarium/server/tests/contract/communities/delete.test.ts`
  - **Test Cases**:
    1. Valid deletion (empty community, only owner) → 200 OK
    2. Has active members → 409 CONFLICT ("Community has X active members, cannot delete")
    3. Has children → 409 CONFLICT ("Community has children, remove them first")
    4. Has posts → 409 CONFLICT ("Community has posts, cannot delete")
    5. Non-owner authenticated → 403 FORBIDDEN
  - **Setup**: Create communities with varying states (empty, with members, with children)
  - **Assertions**: Response schema matches `DeleteResponseSchema`, subsequent requests return 404
  - **Expected**: ALL tests FAIL until T018 implemented

---

## Phase 3.4: Router Handlers (ONLY after contract tests are failing)

**Dependencies**: T007-T012 (contract tests MUST exist and FAIL first)
**Parallel**: All tasks can run in parallel [P] (different handlers in same file, but independent logic)

**IMPORTANT**: All handlers modify `/workspaces/atrarium/server/src/router.ts`. Use version control branches or implement sequentially if conflicts arise.

- [X] **T013 [P]** Implement `createChild` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.createChild = contract.communities.createChild.handler(...)`
  - **Steps**:
    1. Extract `{ env, userDid }` from context
    2. Validate parent exists via `atproto.getCommunityConfig(input.parentId)`
    3. Verify parent is graduated stage → throw `BAD_REQUEST` if not
    4. Verify user is parent owner (check membership role) → throw `FORBIDDEN` if not
    5. Validate feed mix ratios sum to 100 → throw `BAD_REQUEST` if invalid
    6. Validate no circular reference via `atproto.validateCircularReference()` → throw `BAD_REQUEST` if circular
    7. Generate hashtag (`#atrarium_[8-hex]`)
    8. Create PDS record via `atproto.createCommunityConfig()` with `parentGroup` field
    9. Initialize Durable Object for child via `env.COMMUNITY_FEED.idFromName(childId)`
    10. Return `GroupResponseSchema` with `stage: 'theme'`
  - **Error Handling**: Use `ORPCError` with codes: FORBIDDEN, BAD_REQUEST, NOT_FOUND, INTERNAL_SERVER_ERROR
  - **Verification**: T007 contract tests PASS

- [X] **T014 [P]** Implement `upgradeStage` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.upgradeStage = contract.communities.upgradeStage.handler(...)`
  - **Steps**:
    1. Extract `{ env, userDid }` from context
    2. Get community config via `atproto.getCommunityConfig(input.groupId)`
    3. Verify user is owner → throw `FORBIDDEN` if not
    4. Get member count via `atproto.getCommunityStats(input.groupId)`
    5. Validate stage transition via DO RPC `validateStageTransition()` → throw `BAD_REQUEST` if invalid
    6. Update PDS record via `atproto.updateCommunityConfig()` with new `stage`
    7. Invalidate Durable Object cache (trigger via Firehose or direct RPC)
    8. Return updated `GroupResponseSchema`
  - **Error Handling**: Use `ORPCError` with codes: FORBIDDEN, BAD_REQUEST, NOT_FOUND
  - **Verification**: T008 contract tests PASS

- [X] **T015 [P]** Implement `downgradeStage` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.downgradeStage = contract.communities.downgradeStage.handler(...)`
  - **Steps**:
    1. Extract `{ env, userDid }` from context
    2. Get community config via `atproto.getCommunityConfig(input.groupId)`
    3. Verify user is owner → throw `FORBIDDEN` if not
    4. If downgrading from graduated, check children via `atproto.getCommunityChildren()` → throw `CONFLICT` if children exist
    5. Validate stage transition (cannot skip stages) → throw `BAD_REQUEST` if invalid
    6. Update PDS record via `atproto.updateCommunityConfig()` with new `stage`
    7. Invalidate Durable Object cache
    8. Return updated `GroupResponseSchema`
  - **Error Handling**: Use `ORPCError` with codes: FORBIDDEN, BAD_REQUEST, CONFLICT
  - **Verification**: T009 contract tests PASS

- [X] **T016 [P]** Implement `listChildren` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.listChildren = contract.communities.listChildren.handler(...)`
  - **Steps**:
    1. Extract `{ env }` from context (public endpoint, no auth required)
    2. Get children via `atproto.getCommunityChildren(input.parentId)` with pagination
    3. For each child, fetch stats via `atproto.getCommunityStats()` (batched if possible)
    4. Map to `GroupResponseSchema` format
    5. Return `ListChildrenResponseSchema` with children array and cursor
  - **Optimization**: Cache results in parent's Durable Object
  - **Error Handling**: Use `ORPCError` with codes: NOT_FOUND
  - **Verification**: T010 contract tests PASS

- [X] **T017 [P]** Implement `getParent` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.getParent = contract.communities.getParent.handler(...)`
  - **Steps**:
    1. Extract `{ env }` from context (public endpoint)
    2. Get child config via `atproto.getCommunityConfig(input.childId)`
    3. If no `parentGroup` field → return null
    4. Get parent config via `atproto.getCommunityConfig(parentGroup)`
    5. Get parent stats via `atproto.getCommunityStats(parentGroup)`
    6. Return `GroupResponseSchema` for parent
  - **Optimization**: Cache parent reference in child's Durable Object
  - **Error Handling**: Use `ORPCError` with codes: NOT_FOUND
  - **Verification**: T011 contract tests PASS

- [X] **T018 [P]** Implement `delete` handler in `/workspaces/atrarium/server/src/router.ts`
  - **Location**: `router.communities.delete = contract.communities.delete.handler(...)`
  - **Steps**:
    1. Extract `{ env, userDid }` from context
    2. Get community config via `atproto.getCommunityConfig(input.id)`
    3. Verify user is owner → throw `FORBIDDEN` if not
    4. Check active members via `atproto.getCommunityStats()` → throw `CONFLICT` if members > 1 (excluding owner)
    5. Check children via `atproto.getCommunityChildren()` → throw `CONFLICT` if children exist
    6. Check posts via Durable Object RPC `getPostCount()` → throw `CONFLICT` if posts > 0
    7. Delete PDS record via `atproto.deleteCommunityConfig()`
    8. Mark Durable Object as deleted (set flag, future requests return 404)
    9. Return `DeleteResponseSchema` with `success: true`
  - **Error Handling**: Use `ORPCError` with codes: FORBIDDEN, CONFLICT, NOT_FOUND
  - **Verification**: T012 contract tests PASS

---

## Phase 3.5: Integration Tests

**Dependencies**: T013-T018 (all handlers implemented, contract tests passing)
**Parallel**: Sequential (workflow tests depend on previous state)

- [X] **T019** Complete hierarchy lifecycle test in `/workspaces/atrarium/server/tests/integration/hierarchy-lifecycle.test.ts`
  - **Scenario**: Create parent → upgrade to graduated → create child → list children → get parent → delete child → downgrade parent
  - **Steps**:
    1. Create parent community (theme stage)
    2. Add 10 members via PDS
    3. Upgrade parent to community stage
    4. Add 40 more members (total 50)
    5. Upgrade parent to graduated stage
    6. Create child theme under parent
    7. List children → verify child appears
    8. Get parent from child → verify parent metadata
    9. Delete child (empty, no members)
    10. Downgrade parent to community stage (no children now)
  - **Assertions**: Each step succeeds, data flows correctly PDS → DO → API
  - **Verification**: All steps pass without errors

- [X] **T020** Stage transition validation test in `/workspaces/atrarium/server/tests/integration/stage-validation.test.ts`
  - **Scenario**: Attempt invalid stage transitions with insufficient members
  - **Steps**:
    1. Create theme with 5 members
    2. Attempt upgrade to community → expect 400 BAD_REQUEST ("requires 10 members")
    3. Add 5 more members (total 10)
    4. Upgrade to community → expect 200 OK
    5. Attempt upgrade to graduated → expect 400 BAD_REQUEST ("requires 50 members")
    6. Attempt skip stage (theme → graduated) → expect 400 BAD_REQUEST
  - **Assertions**: Validation errors contain clear messages with member counts
  - **Verification**: All validations work correctly

- [X] **T021** Deletion safety test in `/workspaces/atrarium/server/tests/integration/deletion-safety.test.ts`
  - **Scenario**: Attempt deletion with various blockers (members, children, posts)
  - **Steps**:
    1. Create community with 5 active members
    2. Attempt delete → expect 409 CONFLICT ("has 5 active members")
    3. Remove all members except owner
    4. Create 3 posts
    5. Attempt delete → expect 409 CONFLICT ("has posts")
    6. Delete all posts
    7. Upgrade to graduated, create 1 child
    8. Attempt delete → expect 409 CONFLICT ("has children")
    9. Delete child
    10. Delete parent → expect 200 OK
  - **Assertions**: Each blocker prevents deletion, final deletion succeeds
  - **Verification**: All safety checks work correctly

- [X] **T022** Feed mix inheritance test in `/workspaces/atrarium/server/tests/integration/feed-mix.test.ts`
  - **Scenario**: Child inherits or overrides parent feed mix configuration
  - **Steps**:
    1. Create graduated parent with default feed mix (80/0/20)
    2. Create child without specifying feed mix → verify child uses default (80/0/20)
    3. Create child with custom feed mix (50/30/20) → verify child uses custom
    4. Update parent feed mix to (60/20/20)
    5. Verify existing children retain their original feed mix (no retroactive change)
  - **Assertions**: Feed mix inheritance works correctly, updates don't affect existing children
  - **Verification**: Feed mix data flows correctly PDS → DO

- [X] **T023** Circular reference prevention test in `/workspaces/atrarium/server/tests/integration/circular-reference.test.ts`
  - **Scenario**: Detect and prevent circular parent-child relationships
  - **Steps**:
    1. Create parent A (graduated)
    2. Create child B under A
    3. Upgrade B to graduated (add members)
    4. Attempt to create A as child of B → expect 400 BAD_REQUEST ("Circular reference detected")
    5. Create child C under B
    6. Upgrade C to graduated
    7. Attempt to create A as child of C → expect 400 BAD_REQUEST (A is ancestor of C)
  - **Assertions**: Circular reference detection works for multi-level hierarchies
  - **Verification**: BFS traversal algorithm works correctly

---

## Phase 3.6: Quickstart Validation

**Dependencies**: T019-T023 (all integration tests passing)
**Parallel**: Sequential (manual validation steps)

- [X] **T024** Run quickstart.md scenario in `/workspaces/atrarium/specs/019-communities-api-api/quickstart.md`
  - **Steps**: Execute all 10 quickstart steps manually via curl commands
  - **Validation**: All expected results match actual API responses
  - **Edge Cases**: Run 3 edge case tests (circular reference, feed mix, permissions)
  - **Troubleshooting**: Verify error messages are clear and actionable
  - **Success Criteria**: All steps pass, all edge cases handled correctly
  - **Documentation**: Update quickstart.md if any steps need clarification

- [X] **T025** Validate performance targets
  - **Tools**: Use `wrk` or `autocannon` for load testing, or manual `time curl` for p95 measurement
  - **Targets**:
    - Create child: <200ms p95
    - Upgrade/downgrade: <150ms p95
    - List children: <100ms p95
    - Get parent: <50ms p95
    - Delete: <150ms p95
  - **Load**: Run 100 iterations per endpoint, measure p95 latency
  - **Optimization**: If targets not met, profile and optimize bottlenecks
  - **Verification**: All endpoints meet latency targets

- [X] **T026** Update CLAUDE.md Implementation Status
  - **File**: `/workspaces/atrarium/CLAUDE.md`
  - **Changes**:
    1. Mark "Communities API (hierarchy)" as ✅ Completed in Implementation Status section
    2. Update Implementation Status with completion date
    3. Add summary: "All 6 hierarchy API endpoints implemented (createChild, upgradeStage, downgradeStage, listChildren, getParent, delete)"
    4. Update Recent commits section with final merge commit
  - **Verification**: Run `pnpm -r typecheck` to ensure no regressions
  - **Commit Message**: "feat: complete Communities API hierarchy implementation (019-communities-api-api)"

---

## Dependencies Graph

```
Setup Phase (T001-T006):
  T001, T002, T003 [P] → (ATProtoService methods)
  T004, T005, T006 → (Durable Object RPC endpoints)

Contract Tests Phase (T007-T012):
  T007-T012 [P] ← T001-T006 (need infrastructure for test setup)

Router Handlers Phase (T013-T018):
  T013-T018 [P] ← T007-T012 (tests MUST exist and FAIL first)

Integration Tests Phase (T019-T023):
  T019 ← T013-T018 (all handlers implemented)
  T020 ← T019 (lifecycle test passing)
  T021 ← T020 (validation test passing)
  T022 ← T021 (deletion test passing)
  T023 ← T022 (feed mix test passing)

Validation Phase (T024-T026):
  T024 ← T019-T023 (all integration tests passing)
  T025 ← T024 (quickstart validated)
  T026 ← T025 (performance validated)
```

---

## Parallel Execution Examples

### Example 1: Infrastructure Methods (T001-T003)
```bash
# Launch T001-T003 together (different methods in atproto.ts):
Task: "Add getCommunityStats method to server/src/services/atproto.ts"
Task: "Add getCommunityChildren method to server/src/services/atproto.ts"
Task: "Add validateCircularReference method to server/src/services/atproto.ts"
```

### Example 2: Contract Tests (T007-T012)
```bash
# Launch T007-T012 together (different test files):
Task: "Contract test createChild in server/tests/contract/communities/create-child.test.ts"
Task: "Contract test upgradeStage in server/tests/contract/communities/upgrade-stage.test.ts"
Task: "Contract test downgradeStage in server/tests/contract/communities/downgrade-stage.test.ts"
Task: "Contract test listChildren in server/tests/contract/communities/list-children.test.ts"
Task: "Contract test getParent in server/tests/contract/communities/get-parent.test.ts"
Task: "Contract test delete in server/tests/contract/communities/delete.test.ts"
```

### Example 3: Router Handlers (T013-T018)
```bash
# Launch T013-T018 together (different handlers, same file - use branches if conflicts):
Task: "Implement createChild handler in server/src/router.ts"
Task: "Implement upgradeStage handler in server/src/router.ts"
Task: "Implement downgradeStage handler in server/src/router.ts"
Task: "Implement listChildren handler in server/src/router.ts"
Task: "Implement getParent handler in server/src/router.ts"
Task: "Implement delete handler in server/src/router.ts"
```

---

## Notes

- **[P] tasks** = different files or independent logic, no dependencies
- **TDD mandatory**: Write tests first (T007-T012), verify they FAIL, then implement (T013-T018)
- **Constitution Principle 8**: All persistent storage uses PDS + Lexicon schemas (no separate databases)
- **Constitution Principle 10**: Complete implementation (all 6 endpoints, no "Phase 2" deferrals)
- **Commit strategy**: Commit after each task or logical group (e.g., T001-T003 as "feat: add ATProtoService hierarchy methods")
- **Code quality**: Run `pnpm --filter server test` and `pnpm -r typecheck` before marking tasks complete
- **Performance**: Monitor latency during integration tests, optimize if targets not met

---

## Validation Checklist

*GATE: Checked before marking feature complete*

- [ ] All contracts have corresponding tests (T007-T012 ✅)
- [ ] All handlers have tests that pass (T013-T018 ✅)
- [ ] All tests written before implementation (TDD ✅)
- [ ] Parallel tasks truly independent (verified ✅)
- [ ] Each task specifies exact file path (verified ✅)
- [ ] No task modifies same file as another [P] task (router.ts handlers may need coordination)

---

## Completion Criteria (Constitution Principle 10)

*Complete Implementation Over MVP Excuses*

Each task MUST be fully completed before being marked as done:

- [ ] All functionality specified in task description implemented (not partial/MVP)
- [ ] All error handling paths implemented (ORPCError with semantic codes)
- [ ] All validation logic implemented (stage transitions, circular references, deletion safety)
- [ ] All API endpoints implemented and tested (6/6 endpoints functional)
- [ ] No "Phase 2" or "Future Enhancement" comments in code
- [ ] Integration tests passing for completed tasks (T019-T023)
- [ ] Quickstart scenario validated (T024)
- [ ] Performance targets met (T025)

**Acceptable Deferrals** (tracked as separate features):
- Client integration (dashboard UI for hierarchy management) - **FUTURE FEATURE**
- Performance optimizations beyond p95 <200ms target
- Deep hierarchy edge cases (10+ levels, not recommended usage)

**Prohibited Patterns**:
- ❌ "MVP implementation - full version in Phase 2"
- ❌ "TODO: Complete this functionality later"
- ❌ "Placeholder implementation - design pending"
- ❌ Marking task complete while tests are skipped/mocked

---

## Task Execution Status

**Phase 3.1 (Infrastructure)**: ⏳ Ready to start
- T001-T003: ATProtoService methods

**Phase 3.2 (Durable Object)**: ⏳ Blocked by Phase 3.1
- T004-T006: RPC endpoints

**Phase 3.3 (Contract Tests)**: ⏳ Blocked by Phase 3.1-3.2
- T007-T012: TDD contract tests (must FAIL first)

**Phase 3.4 (Router Handlers)**: ⏳ Blocked by Phase 3.3
- T013-T018: Implement handlers (make tests PASS)

**Phase 3.5 (Integration Tests)**: ⏳ Blocked by Phase 3.4
- T019-T023: End-to-end workflows

**Phase 3.6 (Validation)**: ⏳ Blocked by Phase 3.5
- T024-T026: Quickstart, performance, documentation

---

*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
*Generated by /tasks command - Ready for implementation*
