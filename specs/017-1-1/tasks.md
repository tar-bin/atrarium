# Tasks: Hierarchical Group System

**Feature**: 017-1-1
**Input**: Design documents from `/workspaces/atrarium/specs/017-1-1/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/hierarchy-api.md, quickstart.md

---

## Overview

This document provides executable tasks for implementing the hierarchical group system. Tasks are ordered by dependencies and marked with [P] for parallel execution where applicable.

**Implementation Strategy**:
- **TDD Order**: Contract tests → Implementation → Integration tests
- **PDS-First**: All writes to PDS, Durable Objects as 7-day cache (Principle 8)
- **Complete Implementation**: No MVP deferrals (Principle 10)
- **Parallel Execution**: [P] tasks can run concurrently (different files, no dependencies)

---

## Phase 3.1: Setup and Prerequisites

- [x] **T001** Validate existing project structure (monorepo with server/, client/, shared/contracts/)
- [x] **T002** [P] Review Lexicon schemas in `lexicons/net.atrarium.group.config.json` (verify `parentGroup` field exists)
- [x] **T003** [P] Verify PDS-first architecture constraints (no new databases, Durable Objects cache only)
- [x] **T004** [P] Confirm Biome linting/formatting configuration (Constitution Principle 7)
- [x] **T005** [P] Confirm TypeScript type checking configuration (Constitution Principle 7)

---

## Phase 3.2: Contract Tests (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

**CRITICAL**: These tests MUST be written and MUST FAIL before ANY implementation begins.

### Backend Contract Tests (6 endpoints)

- [x] **T006** [P] Contract test `groups.createChild` in `server/tests/contract/hierarchy/create-child.test.ts`
  - Test: Graduated parent creates Theme child → success (child has parent AT-URI)
  - Test: Community parent creates child → 409 Conflict (only Graduated can create children)
  - Test: Non-owner attempts createChild → 403 Forbidden
  - Test: Child created with `stage: 'theme'` and immutable `parentGroup` field

- [x] **T007** [P] Contract test `groups.upgradeStage` in `server/tests/contract/hierarchy/upgrade-stage.test.ts`
  - Test: Theme → Community with memberCount >= 15 → success
  - Test: Theme → Community with memberCount < 15 → 409 Conflict (threshold not met)
  - Test: Community → Graduated with memberCount >= 50 → success
  - Test: Community → Graduated with memberCount < 50 → 409 Conflict
  - Test: Invalid stage transitions (e.g., Theme → Graduated) → 400 Bad Request

- [x] **T008** [P] Contract test `groups.downgradeStage` in `server/tests/contract/hierarchy/downgrade-stage.test.ts`
  - Test: Graduated → Community → success (moderation remains independent)
  - Test: Community → Theme → success (moderation switches to inherited)
  - Test: Graduated with children → Community → success (children retained, but cannot create more)
  - Test: Invalid downgrade (e.g., Theme → Graduated) → 400 Bad Request

- [x] **T009** [P] Contract test `groups.listChildren` in `server/tests/contract/hierarchy/list-children.test.ts`
  - Test: Graduated parent with 3 children → returns all children
  - Test: Graduated parent with no children → returns empty array
  - Test: Community parent (no children capability) → returns empty array
  - Test: Pagination with cursor → returns correct page

- [x] **T010** [P] Contract test `groups.getParent` in `server/tests/contract/hierarchy/get-parent.test.ts`
  - Test: Theme child with parent → returns Graduated parent
  - Test: Graduated group (no parent) → returns null
  - Test: Community group (no parent) → returns null
  - Test: Invalid child ID → 404 Not Found

- [x] **T011** [P] Contract test `groups.delete` (extended validation) in `server/tests/contract/hierarchy/delete-with-children.test.ts`
  - Test: Delete Graduated with 2 children → 409 Conflict (lists child names)
  - Test: Delete Graduated with no children → success
  - Test: Delete Theme child → success (does not affect parent)
  - Test: Delete all children, then parent → success

---

## Phase 3.3: Backend Schema & Validation

- [ ] **T012** [P] Extend validation schemas with stage rules in `server/src/schemas/validation.ts`
  - Add Dunbar threshold constants: `THEME_TO_COMMUNITY_THRESHOLD = 15`, `COMMUNITY_TO_GRADUATED_THRESHOLD = 50`
  - Add stage transition validation: `validateStageUpgrade(currentStage, targetStage, memberCount)`
  - Add stage transition validation: `validateStageDowngrade(currentStage, targetStage)`
  - Add parent-child validation: `validateParentChild(parentStage, childStage)`
  - Add hierarchy depth validation: `validateHierarchyDepth(parentGroupUri)` (max 1 level)

- [ ] **T013** [P] Extend Lexicon validation in `server/src/schemas/lexicon.ts`
  - Add `ParentChildRelationship` type (validates AT-URI format, stage compatibility)
  - Add `GroupStageRules` interface (stage-specific constraints: canHaveParent, canCreateChildren)
  - Add `validateImmutableParent()` function (ensures parentGroup never changes after creation)

- [ ] **T014** [P] Update TypeScript types in `server/src/types.ts`
  - Add `HierarchyConstraints` interface (maxDepth: 1, allowedParentStages: ['graduated'])
  - Add `StageTransitionRequest` interface (groupId, fromStage, toStage, memberCount)
  - Extend `GroupConfig` type with optional `children?: string[]` field (for API responses)

---

## Phase 3.4: PDS Service Extensions

- [ ] **T015** Add `createChildGroup()` method in `server/src/services/atproto.ts`
  - Query parent group from PDS (validate stage === 'graduated')
  - Create child record with `stage: 'theme'` and `parentGroup: parentAtUri` (immutable)
  - Return created child config (includes parent AT-URI)
  - **Validation**: Parent must be Graduated, user must be owner

- [ ] **T016** Add `upgradeGroupStage()` method in `server/src/services/atproto.ts`
  - Fetch current group config from PDS
  - Query member count: `getMemberCount(groupId)` (counts active memberships)
  - Validate stage transition rules (Dunbar thresholds: ~15 for Community, ~50 for Graduated)
  - Update group record with new stage (putRecord)
  - **Validation**: Owner only, member count thresholds, valid stage transitions

- [ ] **T017** Add `downgradeGroupStage()` method in `server/src/services/atproto.ts`
  - Fetch current group config from PDS
  - Validate downgrade rules (Graduated → Community → Theme)
  - Update group record with downgraded stage
  - **Note**: `parentGroup` field retained (immutable)

- [ ] **T018** Add `listChildGroups()` method in `server/src/services/atproto.ts`
  - Query Durable Objects Storage: `storage.get<string[]>(\`children:${parentId}\`)`
  - Fallback to PDS query if cache miss: `listRecords({ collection: 'net.atrarium.group.config', filter: parentGroup === parentAtUri })`
  - Return array of child GroupConfig objects

- [ ] **T019** Add `getParentGroup()` method in `server/src/services/atproto.ts`
  - Query Durable Objects Storage: `storage.get<string>(\`parent:${childId}\`)`
  - Fallback to PDS query if cache miss: fetch child record, extract `parentGroup` AT-URI
  - Resolve parent AT-URI → fetch parent GroupConfig
  - Return parent GroupConfig or null

- [ ] **T020** Add `getMemberCount()` method in `server/src/services/atproto.ts`
  - Query PDS: `listRecords({ collection: 'net.atrarium.group.membership', repo: userDid })`
  - Filter memberships: `membership.group === groupAtUri && membership.active === true`
  - Return count of active memberships
  - **Used for**: Stage progression threshold validation

---

## Phase 3.5: Durable Objects Extensions

- [ ] **T021** Extend `CommunityFeedGenerator` with parent/children cache in `server/src/durable-objects/community-feed-generator.ts`
  - Add `parent:<groupId>` storage key (stores parent AT-URI string)
  - Add `children:<groupId>` storage key (stores child IDs array: `string[]`)
  - Update Firehose indexing to set parent/children keys on group creation
  - Add `getChildren()` RPC method (returns cached child IDs)

- [ ] **T022** Add parent-child validation in Firehose indexing in `server/src/durable-objects/community-feed-generator.ts`
  - Validate parent stage === 'graduated' when indexing child creation
  - Validate child stage === 'theme' at creation time
  - Reject records with `parentGroup.parentGroup !== undefined` (max depth 1 level)
  - Update `children:<parentId>` array when child created

- [ ] **T023** Add moderation inheritance logic in `server/src/durable-objects/community-feed-generator.ts`
  - For Theme groups: fetch parent AT-URI from `parent:<groupId>` key
  - Query parent group's moderators list
  - Cache inherited moderators in `inherited_moderators:<groupId>` key (7-day TTL)
  - Moderation API checks: if Theme, verify moderator in parent's moderators list

---

## Phase 3.6: Firehose Processor Extensions

- [ ] **T024** Add hierarchy validation in Firehose processor in `server/src/workers/firehose-processor.ts`
  - Validate parent-child stage combinations (Graduated → Theme only)
  - Validate `parentGroup` immutability (reject updates to parentGroup field)
  - Validate circular references (child cannot reference itself or descendants)
  - Tag posts with `parentGroupId` for feed aggregation (if child group)

- [ ] **T025** Update post indexing for hierarchy in `server/src/workers/firehose-processor.ts`
  - Extract `parentGroup` from group config
  - If parent exists: index post in both child DO and parent DO (`post:<timestamp>:<rkey>` keys)
  - Update parent feed aggregation: include posts from all children
  - Maintain existing 7-day TTL for cached posts

---

## Phase 3.7: API Route Handlers

- [ ] **T026** Implement `POST /api/groups/:id/children` (createChild) in `server/src/routes/communities.ts`
  - Validate JWT authentication (owner only)
  - Call `atprotoService.createChildGroup(parentId, name, description, feedMix)`
  - Trigger Durable Object update via RPC (add to parent's children list)
  - Return created child GroupResponse (includes parent AT-URI)

- [ ] **T027** Implement `POST /api/groups/:id/upgrade` (upgradeStage) in `server/src/routes/communities.ts`
  - Validate JWT authentication (owner only)
  - Call `atprotoService.upgradeGroupStage(groupId, targetStage)`
  - Validate Dunbar thresholds (~15 for Community, ~50 for Graduated)
  - Return updated GroupResponse with new stage

- [ ] **T028** Implement `POST /api/groups/:id/downgrade` (downgradeStage) in `server/src/routes/communities.ts`
  - Validate JWT authentication (owner only)
  - Call `atprotoService.downgradeGroupStage(groupId, targetStage)`
  - Validate downgrade rules (bidirectional transitions allowed)
  - Return updated GroupResponse with downgraded stage

- [ ] **T029** Implement `GET /api/groups/:id/children` (listChildren) in `server/src/routes/communities.ts`
  - Optional authentication (public endpoint)
  - Call `atprotoService.listChildGroups(parentId, limit, cursor)`
  - Return ListChildrenResponse (array of child GroupResponse objects)

- [ ] **T030** Implement `GET /api/groups/:id/parent` (getParent) in `server/src/routes/communities.ts`
  - Optional authentication (public endpoint)
  - Call `atprotoService.getParentGroup(childId)`
  - Return parent GroupResponse or null (if no parent)

- [ ] **T031** Extend `DELETE /api/groups/:id` with children validation in `server/src/routes/communities.ts`
  - Validate JWT authentication (owner only)
  - Query children: `atprotoService.listChildGroups(groupId)`
  - If children exist: throw 409 Conflict error with child names
  - If no children: proceed with deletion (call existing delete logic)

---

## Phase 3.8: oRPC Contract Implementation

- [ ] **T032** [P] Add hierarchy schemas to oRPC contracts in `shared/contracts/src/schemas.ts`
  - Add `CreateChildInputSchema` (parentId, name, description?, feedMix?)
  - Add `UpgradeStageInputSchema` (groupId, targetStage: 'community' | 'graduated')
  - Add `DowngradeStageInputSchema` (groupId, targetStage: 'theme' | 'community')
  - Add `ListChildrenInputSchema` (parentId, limit?, cursor?)
  - Add `GetParentInputSchema` (childId)
  - Extend `GroupResponseSchema` with optional `parentGroup?: string`, `children?: string[]`

- [ ] **T033** Add hierarchy endpoints to oRPC router in `shared/contracts/src/router.ts`
  - Add `groups.createChild` contract (input: CreateChildInputSchema, output: GroupResponseSchema)
  - Add `groups.upgradeStage` contract (input: UpgradeStageInputSchema, output: GroupResponseSchema)
  - Add `groups.downgradeStage` contract (input: DowngradeStageInputSchema, output: GroupResponseSchema)
  - Add `groups.listChildren` contract (input: ListChildrenInputSchema, output: ListChildrenResponseSchema)
  - Add `groups.getParent` contract (input: GetParentInputSchema, output: GroupResponseSchema | null)
  - Extend `groups.delete` contract with children validation logic

---

## Phase 3.9: Frontend Components

- [ ] **T034** [P] Create `GroupHierarchy` component in `client/src/components/communities/GroupHierarchy.tsx`
  - Display parent-child tree view (Radix UI Accordion for collapsible hierarchy)
  - Show stage badges (Theme/Community/Graduated) with member counts
  - Clickable group names → navigate to group detail page
  - Handle 1-level depth constraint (no grandchildren display)

- [ ] **T035** [P] Create `StageUpgradeButton` component in `client/src/components/communities/StageUpgradeButton.tsx`
  - Display upgrade button when Dunbar threshold met (memberCount >= ~15 or ~50)
  - Show modal confirmation: "Upgrade [Group Name] to [Target Stage]?"
  - Call `apiClient.groups.upgradeStage({ groupId, targetStage })`
  - Handle success: show toast, invalidate group query cache
  - Handle errors: display error message (e.g., threshold not met)

- [ ] **T036** [P] Create `CreateChildTheme` component in `client/src/components/communities/CreateChildTheme.tsx`
  - Form fields: name (required, maxLength: 200), description (optional, maxLength: 2000)
  - Visible only for Graduated-stage groups (hide for Theme/Community)
  - Call `apiClient.groups.createChild({ parentId, name, description })`
  - Handle success: navigate to new child group detail page
  - Handle errors: display validation errors (e.g., parent not Graduated)

- [ ] **T037** [P] Create `ParentLink` component in `client/src/components/communities/ParentLink.tsx`
  - Display breadcrumb: `[Parent Name] > [Current Group Name]`
  - Clickable parent name → navigate to parent group detail page
  - Visible only for Theme groups with `parentGroup` field
  - Handle null parent gracefully (no link displayed)

- [ ] **T038** [P] Create `InheritedModeration` indicator in `client/src/components/moderation/InheritedModeration.tsx`
  - Display "Moderated by: [Parent Name] (inherited)" for Theme groups
  - Display "Independent moderation" for Community/Graduated groups
  - Show parent link for Theme groups (clickable → navigate to parent)

---

## Phase 3.10: Frontend Routes

- [ ] **T039** Add children list route in `client/src/routes/communities/$id/children.tsx`
  - Use TanStack Router file-based routing
  - Fetch children: `useQuery(['group', groupId, 'children'], () => apiClient.groups.listChildren({ parentId: groupId }))`
  - Display `GroupHierarchy` component with children list
  - Handle empty state: "No child themes yet" with "Create Child Theme" button

- [ ] **T040** Extend group detail page with hierarchy UI in `client/src/routes/communities/$id/index.tsx`
  - Add "Child Themes" section (visible only for Graduated groups with children)
  - Add `ParentLink` component (visible only for Theme groups with parent)
  - Add `StageUpgradeButton` component (visible when threshold met)
  - Add `CreateChildTheme` button (visible only for Graduated groups)
  - Display `InheritedModeration` indicator (visible for Theme groups)

---

## Phase 3.11: Frontend API Integration

- [ ] **T041** Add hierarchy API methods in `client/src/lib/api.ts`
  - Add `createChild(parentId, name, description?, feedMix?)` → returns GroupResponse
  - Add `upgradeStage(groupId, targetStage)` → returns GroupResponse
  - Add `downgradeStage(groupId, targetStage)` → returns GroupResponse
  - Add `listChildren(parentId, limit?, cursor?)` → returns ListChildrenResponse
  - Add `getParent(childId)` → returns GroupResponse | null
  - Extend `deleteGroup(groupId)` with error handling for 409 Conflict (children exist)

- [ ] **T042** Add TanStack Query hooks for hierarchy in `client/src/lib/hooks/useGroupHierarchy.ts`
  - Add `useChildren(groupId)` hook (uses `useQuery(['group', groupId, 'children'])`)
  - Add `useParent(groupId)` hook (uses `useQuery(['group', groupId, 'parent'])`)
  - Add `useUpgradeStage()` mutation (invalidates group query on success)
  - Add `useDowngradeStage()` mutation (invalidates group query on success)
  - Add `useCreateChild()` mutation (invalidates parent's children query on success)

---

## Phase 3.12: Integration Tests

- [ ] **T043** [P] Integration test: Graduated creates Theme child in `server/tests/integration/hierarchy/create-child-flow.test.ts`
  - Setup: Create Graduated group (50 members)
  - Action: Call createChild API
  - Verify: Child created with stage='theme', parentGroup AT-URI set
  - Verify: Parent's children list includes new child
  - Verify: Durable Objects cache updated (parent: and children: keys)

- [ ] **T044** [P] Integration test: Theme → Community → Graduated progression in `server/tests/integration/hierarchy/stage-progression-flow.test.ts`
  - Setup: Create Theme group (1 member)
  - Action: Add 14 members → upgrade to Community (memberCount = 15)
  - Action: Add 35 members → upgrade to Graduated (memberCount = 50)
  - Verify: Each upgrade validates member count thresholds
  - Verify: PDS records updated with new stage at each step

- [ ] **T045** [P] Integration test: Moderation inheritance in `server/tests/integration/hierarchy/moderation-inheritance-flow.test.ts`
  - Setup: Create Graduated parent + Theme child
  - Action: Parent owner moderates post in child theme
  - Verify: Moderation succeeds (inherited moderation rights)
  - Action: Child Theme upgrades to Community (independent moderation)
  - Verify: Parent owner can no longer moderate child posts

- [ ] **T046** [P] Integration test: Deletion blocking in `server/tests/integration/hierarchy/deletion-blocking-flow.test.ts`
  - Setup: Create Graduated parent + 3 Theme children
  - Action: Attempt to delete parent
  - Verify: 409 Conflict error (includes child names)
  - Action: Delete all children
  - Action: Delete parent
  - Verify: Deletion succeeds (no children remaining)

- [ ] **T047** [P] Integration test: Feed aggregation in `server/tests/integration/hierarchy/feed-aggregation-flow.test.ts`
  - Setup: Create Graduated parent + 2 Theme children
  - Action: Post to child theme A, child theme B, and parent
  - Verify: Parent feed includes posts from: self + child A + child B (aggregated)
  - Verify: Child feeds only include own posts (no aggregation at child level)

---

## Phase 3.13: Frontend Component Tests

- [ ] **T048** [P] Component test: `GroupHierarchy` rendering in `client/tests/components/GroupHierarchy.test.tsx`
  - Setup: Mock parent group with 3 children (via MSW)
  - Render: `<GroupHierarchy groupId="parent123" />`
  - Verify: Parent and children displayed in tree view
  - Verify: Clickable group names navigate correctly

- [ ] **T049** [P] Component test: `StageUpgradeButton` behavior in `client/tests/components/StageUpgradeButton.test.tsx`
  - Setup: Mock group with memberCount = 15 (eligible for Community)
  - Render: `<StageUpgradeButton group={mockGroup} />`
  - Verify: Upgrade button visible and enabled
  - Action: Click button → modal opens → confirm upgrade
  - Verify: API call made with correct targetStage

- [ ] **T050** [P] Component test: `CreateChildTheme` form in `client/tests/components/CreateChildTheme.test.tsx`
  - Setup: Mock Graduated parent group
  - Render: `<CreateChildTheme parentId="graduated123" />`
  - Action: Fill form (name, description) → submit
  - Verify: API call made with correct input
  - Verify: Success toast displayed, navigation to child detail page

---

## Phase 3.14: E2E Tests (Playwright)

- [ ] **T051** [P] E2E test: Complete quickstart scenario in `client/tests/e2e/hierarchy-quickstart.spec.ts`
  - Follow all steps from `specs/017-1-1/quickstart.md`
  - Step 1-5: Create Theme → upgrade to Community → upgrade to Graduated
  - Step 6-8: Create 3 child themes, browse hierarchy, test moderation inheritance
  - Step 9: Test deletion blocking
  - Verify: All acceptance criteria from spec.md met

---

## Phase 3.15: Polish & Validation

- [ ] **T052** [P] Add unit tests for stage validation in `server/tests/unit/stage-validation.test.ts`
  - Test: `validateStageUpgrade()` with various member counts
  - Test: `validateStageDowngrade()` with all stage combinations
  - Test: `validateParentChild()` with invalid stage combinations (e.g., Community → Theme)
  - Test: `validateHierarchyDepth()` rejects grandchildren

- [ ] **T053** [P] Add unit tests for Dunbar thresholds in `server/tests/unit/dunbar-thresholds.test.ts`
  - Test: Theme → Community requires memberCount >= 15
  - Test: Community → Graduated requires memberCount >= 50
  - Test: Threshold validation edge cases (memberCount = 14 vs 15, 49 vs 50)

- [ ] **T054** Performance test: Hierarchy queries <10ms in `server/tests/performance/hierarchy-query.test.ts`
  - Test: `listChildren()` with 10 children completes in <10ms (Durable Objects cache)
  - Test: `getParent()` completes in <5ms (cached parent AT-URI)
  - Test: Feed aggregation (parent + 5 children) completes in <50ms

- [ ] **T055** Update API documentation in `server/README.md` or `server/API.md`
  - Document 6 new hierarchy endpoints (createChild, upgradeStage, downgradeStage, listChildren, getParent, delete-with-validation)
  - Add examples for each endpoint (request/response)
  - Document Dunbar thresholds (~15, ~50)
  - Document hierarchy constraints (1-level, Graduated→Theme only)

- [ ] **T056** Update Dashboard documentation in `client/README.md`
  - Document new hierarchy UI components (GroupHierarchy, StageUpgradeButton, CreateChildTheme)
  - Add screenshots of hierarchy views
  - Document stage progression workflow (Theme → Community → Graduated)
  - Document moderation inheritance behavior

- [ ] **T057** Run all tests and fix any failures
  - Run: `pnpm -r test` (all workspace tests)
  - Fix: Any test failures in contract, integration, unit tests
  - Verify: E2E tests pass (Playwright)

- [ ] **T058** Run Biome linting/formatting and fix all issues (Constitution Principle 7)
  - Run: `pnpm lint` (check linting issues)
  - Run: `pnpm format` (auto-fix formatting)
  - Fix: Any remaining linting errors manually

- [ ] **T059** Run TypeScript type checking and fix all errors (Constitution Principle 7)
  - Run: `pnpm -r typecheck` (all workspaces)
  - Fix: Type errors in server/, client/, shared/contracts/
  - Note: Generated code type errors are allowed per Constitution v1.4.0

- [ ] **T060** Execute quickstart validation from `specs/017-1-1/quickstart.md`
  - Follow all 10 steps in quickstart.md
  - Verify: All acceptance criteria met
  - Document: Any deviations or issues found

- [ ] **T061** Performance validation: API response times <200ms p95
  - Test: Hierarchy endpoints under load (50 concurrent requests)
  - Verify: p95 response time <200ms for all endpoints
  - Verify: Durable Objects read latency <10ms

- [ ] **T062** Final Constitution compliance check
  - Verify: No new databases added (Principle 8 - PDS + Durable Objects only)
  - Verify: All features fully implemented (Principle 10 - no MVP deferrals)
  - Verify: Pre-commit hooks pass (Principle 7 - linting, formatting, type checking)
  - Verify: All changes committed (Principle 9 - no partial merges)

---

## Dependencies

### Phase Dependencies
1. **Setup (T001-T005)** → Blocks all other phases
2. **Contract Tests (T006-T011)** → MUST complete and FAIL before implementation
3. **Backend Schema (T012-T014)** → Blocks PDS Service (T015-T020), Durable Objects (T021-T023)
4. **PDS Service (T015-T020)** → Blocks API Routes (T026-T031)
5. **Durable Objects (T021-T023)** → Blocks API Routes (T026-T031), Firehose (T024-T025)
6. **Firehose (T024-T025)** → Blocks Integration Tests (T043-T047)
7. **API Routes (T026-T031)** → Blocks oRPC Contracts (T032-T033), Integration Tests (T043-T047)
8. **oRPC Contracts (T032-T033)** → Blocks Frontend API (T041-T042)
9. **Frontend Components (T034-T038)** → Blocks Frontend Routes (T039-T040), Component Tests (T048-T050)
10. **Frontend Routes (T039-T040)** → Blocks E2E Tests (T051)
11. **All Implementation (T012-T042)** → Blocks Polish (T052-T062)

### Specific Task Dependencies
- T012, T013, T014 block T015-T020 (schemas before PDS methods)
- T015-T020 block T026-T031 (PDS methods before API routes)
- T021-T023 block T026-T031 (Durable Objects before API routes)
- T026-T031 block T032-T033 (API routes before oRPC contracts)
- T032-T033 block T041-T042 (oRPC contracts before frontend API)
- T034-T038 block T039-T040 (components before routes)
- T039-T040 block T051 (routes before E2E tests)

---

## Parallel Execution Examples

### Contract Tests (Phase 3.2)
All contract tests can run in parallel (different files, no dependencies):

```bash
# Launch T006-T011 together (6 contract tests)
pnpm --filter server exec vitest run tests/contract/hierarchy/create-child.test.ts &
pnpm --filter server exec vitest run tests/contract/hierarchy/upgrade-stage.test.ts &
pnpm --filter server exec vitest run tests/contract/hierarchy/downgrade-stage.test.ts &
pnpm --filter server exec vitest run tests/contract/hierarchy/list-children.test.ts &
pnpm --filter server exec vitest run tests/contract/hierarchy/get-parent.test.ts &
pnpm --filter server exec vitest run tests/contract/hierarchy/delete-with-children.test.ts &
wait
```

### Backend Schema (Phase 3.3)
Schema tasks can run in parallel (different files):

```bash
# Launch T012-T014 together (3 schema tasks)
# Edit server/src/schemas/validation.ts
# Edit server/src/schemas/lexicon.ts
# Edit server/src/types.ts
# (Execute in parallel using separate terminal tabs or Task agents)
```

### Frontend Components (Phase 3.9)
Component tasks can run in parallel (different files):

```bash
# Launch T034-T038 together (5 component tasks)
# Create client/src/components/communities/GroupHierarchy.tsx
# Create client/src/components/communities/StageUpgradeButton.tsx
# Create client/src/components/communities/CreateChildTheme.tsx
# Create client/src/components/communities/ParentLink.tsx
# Create client/src/components/moderation/InheritedModeration.tsx
# (Execute in parallel using separate Task agents)
```

### Integration Tests (Phase 3.12)
Integration tests can run in parallel (different test files):

```bash
# Launch T043-T047 together (5 integration tests)
pnpm --filter server exec vitest run tests/integration/hierarchy/create-child-flow.test.ts &
pnpm --filter server exec vitest run tests/integration/hierarchy/stage-progression-flow.test.ts &
pnpm --filter server exec vitest run tests/integration/hierarchy/moderation-inheritance-flow.test.ts &
pnpm --filter server exec vitest run tests/integration/hierarchy/deletion-blocking-flow.test.ts &
pnpm --filter server exec vitest run tests/integration/hierarchy/feed-aggregation-flow.test.ts &
wait
```

---

## Notes

- **[P] Marker**: Tasks marked with [P] can run in parallel (different files, no dependencies)
- **TDD Enforcement**: Contract tests (T006-T011) MUST be written and failing before implementation begins
- **Constitution Compliance**:
  - Principle 8: All persistent storage uses PDS + Lexicon schemas (no separate databases)
  - Principle 10: Complete implementation (no MVP deferrals, no "Phase 2" placeholders)
  - Principle 7: Biome linting, formatting, and TypeScript type checking enforced
- **Commit Strategy**: Commit after completing each task (atomic changes)
- **Error Handling**: All API endpoints must implement full error handling (400, 403, 404, 409 errors)
- **Validation**: All input validation uses Zod schemas (runtime type safety)

---

## Completion Criteria (Constitution Principle 10)

Each task MUST be fully completed before being marked as done:

✅ **Required for Completion**:
- All functionality specified in task description implemented (not partial/MVP)
- All error handling paths implemented (400, 403, 404, 409 responses)
- All validation logic implemented (Zod schemas, stage rules, Dunbar thresholds)
- All UI components created and integrated (no placeholders)
- All API endpoints implemented and tested (no mocked responses)
- Integration tests passing for completed tasks

❌ **Prohibited Patterns**:
- "MVP implementation - full version in Phase 2"
- "TODO: Complete this functionality later"
- "Placeholder UI - design pending"
- Marking task complete while tests are skipped/mocked
- Using `@ts-ignore` or `any` types to bypass validation

✅ **Acceptable Deferrals** (must be tracked as separate tasks):
- Performance optimizations beyond <200ms p95 target
- Non-critical edge cases (documented in task notes)
- Features explicitly scoped out of spec.md

---

## Validation Checklist

Before marking tasks.md as complete, verify:

- [x] All 6 contract endpoints have corresponding tests (T006-T011)
- [x] All 3 entities (Group, Membership, Stage) have schema tasks (T012-T014)
- [x] All 6 PDS methods have implementation tasks (T015-T020)
- [x] All 6 API endpoints have handler tasks (T026-T031)
- [x] All 5 frontend components have creation tasks (T034-T038)
- [x] All 5 integration test scenarios have test tasks (T043-T047)
- [x] All tests come before implementation (Phase 3.2 before Phase 3.3+)
- [x] Parallel tasks are truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Constitution Principle 8 verified (PDS-first, no new databases)
- [x] Constitution Principle 10 verified (complete implementation, no MVP deferrals)

---

**Tasks Ready for Execution** - Total: 62 tasks (5 setup + 6 contract tests + 51 implementation/polish)
