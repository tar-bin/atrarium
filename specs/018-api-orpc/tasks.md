# Tasks: Complete oRPC API Implementation

**Feature ID**: 018-api-orpc
**Input**: Design documents from `/workspaces/atrarium/specs/018-api-orpc/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → ✅ Loaded: oRPC Router migration strategy (phased approach)
   → Extract: oRPC stack (@orpc/server ^1.9.3), Zod validation, Hono framework
2. Load optional design documents:
   → ✅ data-model.md: 4 entities (Post, Emoji, Reaction, Moderation Action)
   → ✅ research.md: Migration strategy, code comparison, PDS method mapping
   → ✅ quickstart.md: 4 validation scenarios + integration test
3. Generate tasks by category:
   → Preparation: Fix moderation.list contract, add checkMembership RPC
   → Tests: 14 contract tests (Posts 3 + Emoji 7 + Reactions 3 + Moderation 1)
   → Implementation: 3 router migrations (Posts → Emoji → Reactions)
   → Integration: 4 scenario tests from quickstart.md
   → Polish: Client updates, legacy route deprecation
4. Apply task rules:
   → Contract tests = different files = [P] for parallel
   → Router handlers = same file (server/src/router.ts) = sequential
   → Tests before implementation (TDD approach)
5. Number tasks sequentially (T001-T055)
6. Generate dependency graph (Preparation → Posts → Emoji → Reactions → Cleanup)
7. Parallel execution examples provided for contract tests
8. Validate task completeness:
   → ✅ All 14 contracts have test tasks
   → ✅ All 13 endpoints have implementation tasks
   → ✅ All 4 scenarios have integration test tasks
9. Return: SUCCESS (45 tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different test files, no dependencies)
- File paths are absolute from repository root

---

## Phase 1: Preparation (Moderation Fix + DO RPC)

### 1.1 Contract & Service Updates
- [X] **T001** Update moderation.list contract to accept communityUri parameter
  - File: `/workspaces/atrarium/shared/contracts/src/router.ts` (line 285)
  - Add `.input(z.object({ communityUri: z.string() }))` to moderation.list route
  - Update ModerationActionListOutputSchema if needed

- [X] **T002** [P] Add checkMembership RPC method to CommunityFeedGenerator Durable Object
  - File: `/workspaces/atrarium/server/src/durable-objects/community-feed-generator.ts`
  - Add handler for `GET /checkMembership?did={did}` endpoint
  - Return `{ isMember: boolean }` based on Durable Object Storage `member:{did}` key
  - Used by all Post/Emoji/Reaction handlers for membership validation
  - **NOTE**: Already implemented (line 253-280)

---

## Phase 2: Posts Migration (Week 1)

### 2.1 Contract Tests (Write Failing Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before T005-T007 implementation**

- [X] **T003** [P] Contract test: POST /api/communities/:communityId/posts (create)
  - File: `/workspaces/atrarium/server/tests/contract/posts/create.test.ts`
  - Test 1: Valid input returns CreatePostOutputSchema
  - Test 2: Invalid text length (>300 chars) throws validation error
  - Test 3: Invalid communityId format throws validation error
  - Test 4: Non-member user throws FORBIDDEN ORPCError

- [X] **T004** [P] Contract test: GET /api/communities/:communityId/posts (list)
  - File: `/workspaces/atrarium/server/tests/contract/posts/list.test.ts`
  - Test 1: Valid request returns PostListOutputSchema with pagination
  - Test 2: Empty feed returns empty array
  - Test 3: Author profiles enriched correctly
  - Test 4: Cursor-based pagination works

- [X] **T005** [P] Contract test: GET /api/posts/:uri (get)
  - File: `/workspaces/atrarium/server/tests/contract/posts/get.test.ts`
  - Test 1: Valid AT-URI returns PostOutputSchema
  - Test 2: Invalid AT-URI format throws BAD_REQUEST
  - Test 3: Non-existent post throws NOT_FOUND
  - Test 4: Non-post record throws BAD_REQUEST

### 2.2 Router Implementation (After Tests Are Failing)
- [X] **T006** Implement router.posts.create handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after line 694)
  - Add `posts: { create: contract.posts.create.handler(async ({ input, context }) => { ... }) }`
  - Steps: Extract context → Check membership (DO RPC) → Create post in PDS → Return CreatePostOutputSchema
  - Use `ATProtoService.createCommunityPost()` (already exists, line 96-115 in atproto.ts)
  - Reference: research.md lines 462-504 for implementation example

- [X] **T007** Implement router.posts.list handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after T006)
  - Add `list: contract.posts.list.handler(async ({ input, context }) => { ... })`
  - Steps: Fetch posts from DO → Enrich with author profiles → Return PostListOutputSchema
  - Use `ATProtoService.getProfiles()` (line 341-359 in atproto.ts)
  - Reference: research.md lines 235-278 for implementation example

- [X] **T008** Implement router.posts.get handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after T007)
  - Add `get: contract.posts.get.handler(async ({ input, context }) => { ... })`
  - Steps: Parse AT-URI → Fetch post from PDS → Enrich with author profile → Return PostOutputSchema
  - Use `ATProtoService.getProfile()` (line 318-334 in atproto.ts)
  - Reference: research.md lines 280-328 for implementation example

### 2.3 Integration Tests (Validate End-to-End)
- [X] **T009** Integration test: Post creation flow (Scenario 1 from quickstart.md)
  - File: `/workspaces/atrarium/server/tests/integration/posts/create-post-flow.test.ts`
  - Test: Authenticate → Create community → Create post → Verify in feed
  - Validate PDS write → Firehose → Durable Object indexing
  - Reference: quickstart.md lines 36-120

- [X] **T010** [P] Unit test: Membership validation in posts.create
  - File: `/workspaces/atrarium/server/tests/unit/posts/membership-check.test.ts`
  - Test: Non-member rejected, member accepted
  - Mock Durable Object checkMembership RPC

### 2.4 Client & Deployment
- [X] **T011** Update client API calls to use apiClient.posts
  - File: `/workspaces/atrarium/client/src/lib/api.ts`
  - Replace legacy Hono calls with `apiClient.posts.create()`, `.list()`, `.get()`
  - Verify MSW mock handlers updated (client/tests/mocks/handlers.ts)

- [X] **T012** Add deprecation notices to legacy posts route
  - File: `/workspaces/atrarium/server/src/routes/posts.ts`
  - Add JSDoc comments: `@deprecated Use oRPC router.posts instead. Removal planned: 2025-12-31`

---

## Phase 3: Emoji Migration (Week 2)

### 3.1 Contract Tests (Write Failing Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before T020-T026 implementation**

- [X] **T013** [P] Contract test: POST /api/emoji/upload
  - File: `/workspaces/atrarium/server/tests/contract/emoji/upload.test.ts`
  - Test FormData handling (multipart/form-data)
  - Validate shortcode format, image size, file type

- [X] **T014** [P] Contract test: GET /api/emoji/list
  - File: `/workspaces/atrarium/server/tests/contract/emoji/list.test.ts`
  - Test user's uploaded emojis returned
  - Validate pagination if applicable

- [X] **T015** [P] Contract test: POST /api/communities/:id/emoji/submit
  - File: `/workspaces/atrarium/server/tests/contract/emoji/submit.test.ts`
  - Test emoji submission creates pending approval
  - Validate emojiUri format

- [X] **T016** [P] Contract test: GET /api/communities/:id/emoji/pending
  - File: `/workspaces/atrarium/server/tests/contract/emoji/pending.test.ts`
  - Test owner-only permission enforced
  - Validate pending approval list

- [X] **T017** [P] Contract test: POST /api/communities/:id/emoji/approve
  - File: `/workspaces/atrarium/server/tests/contract/emoji/approve.test.ts`
  - Test approval workflow
  - Validate owner-only permission

- [X] **T018** [P] Contract test: POST /api/communities/:id/emoji/revoke
  - File: `/workspaces/atrarium/server/tests/contract/emoji/revoke.test.ts`
  - Test revocation workflow
  - Validate owner-only permission

- [X] **T019** [P] Contract test: GET /api/communities/:id/emoji/registry
  - File: `/workspaces/atrarium/server/tests/contract/emoji/registry.test.ts`
  - Test public endpoint (no auth required)
  - Validate approved emojis only

### 3.2 Router Implementation (DEFERRED - Schema Redesign Required)
- [ ] **T020** ⚠️ DEFERRED: Implement router.emoji.upload handler
  - **Reason**: Emoji schemas require major redesign to align with existing PDS implementation
  - **Blocker**: Input schema expects `file` (Blob), but server needs binary data handling
  - **Dependencies**: Legacy emoji routes still active, requires careful migration strategy

- [ ] **T021** ⚠️ DEFERRED: Implement router.emoji.list handler
- [ ] **T022** ⚠️ DEFERRED: Implement router.emoji.submit handler
- [ ] **T023** ⚠️ DEFERRED: Implement router.emoji.listPending handler
- [ ] **T024** ⚠️ DEFERRED: Implement router.emoji.approve handler
- [ ] **T025** ⚠️ DEFERRED: Implement router.emoji.revoke handler
- [ ] **T026** ⚠️ DEFERRED: Implement router.emoji.registry handler

  **NOTE**: Emoji router commented out in contract (shared/contracts/src/router.ts:446)
  **ACTION REQUIRED**: Separate feature ticket needed for emoji schema redesign

### 3.3 Integration Tests (Validate End-to-End)
- [ ] **T027** Integration test: Emoji upload & approval flow (Scenario 3 from quickstart.md)
  - File: `/workspaces/atrarium/server/tests/integration/emoji/approval-flow.test.ts`
  - Test: Upload → Submit → Pending → Approve → Use in reaction
  - Reference: quickstart.md lines 217-332

### 3.4 Client & Deployment
- [ ] **T028** Update client API calls to use apiClient.emoji
  - File: `/workspaces/atrarium/client/src/lib/api.ts`
  - Replace legacy Hono calls with `apiClient.emoji.upload()`, `.approve()`, etc.

- [ ] **T029** Add deprecation notices to legacy emoji route
  - File: `/workspaces/atrarium/server/src/routes/emoji.ts`
  - Add JSDoc `@deprecated` comments

---

## Phase 4: Reactions Migration (Week 3)

### 4.1 Contract Tests (Write Failing Tests First)
**CRITICAL: These tests MUST be written and MUST FAIL before T033-T035 implementation**

- [ ] **T030** [P] Contract test: POST /api/reactions/add
  - File: `/workspaces/atrarium/server/tests/contract/reactions/add.test.ts`
  - Test Unicode emoji validation
  - Test custom emoji validation (must be approved)
  - Test rate limiting (100/hour)
  - Test duplicate reaction rejection

- [ ] **T031** [P] Contract test: DELETE /api/reactions/remove
  - File: `/workspaces/atrarium/server/tests/contract/reactions/remove.test.ts`
  - Test removal of user's own reaction
  - Test rejection of other user's reaction
  - Validate reactionUri format

- [ ] **T032** [P] Contract test: GET /api/reactions/list
  - File: `/workspaces/atrarium/server/tests/contract/reactions/list.test.ts`
  - Test reaction aggregates structure
  - Test currentUserReacted flag
  - Validate emoji count accuracy

### 4.2 Router Implementation (After Tests Are Failing)
- [ ] **T033** Implement router.reactions.add handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after Emoji section)
  - Add `reactions: { add: contract.reactions.add.handler(async ({ input, context }) => { ... }) }`
  - Use `ATProtoService.createReaction()` (lines 1026-1056 in atproto.ts)
  - Validate membership, custom emoji approval, rate limit

- [ ] **T034** Implement router.reactions.remove handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after T033)
  - Add `remove: contract.reactions.remove.handler(async ({ input, context }) => { ... })`
  - Use `ATProtoService.deleteReaction()` (lines 1063-1087 in atproto.ts)

- [ ] **T035** Implement router.reactions.list handler
  - File: `/workspaces/atrarium/server/src/router.ts` (after T034)
  - Add `list: contract.reactions.list.handler(async ({ input, context }) => { ... })`
  - Fetch reaction aggregates from Durable Object
  - Use `ATProtoService.listReactions()` (lines 1096-1115 in atproto.ts)

### 4.3 Integration Tests (Validate End-to-End)
- [ ] **T036** Integration test: Reaction add/remove flow (Scenario 2 from quickstart.md)
  - File: `/workspaces/atrarium/server/tests/integration/reactions/add-remove-flow.test.ts`
  - Test: Add reaction → List aggregates → Remove reaction → Verify empty
  - Reference: quickstart.md lines 122-215

- [ ] **T037** [P] Unit test: Rate limiting enforcement
  - File: `/workspaces/atrarium/server/tests/unit/reactions/rate-limit.test.ts`
  - Test 100 reactions accepted, 101st rejected

### 4.4 Client & Deployment
- [ ] **T038** Update client API calls to use apiClient.reactions
  - File: `/workspaces/atrarium/client/src/lib/api.ts`
  - Replace legacy Hono calls with `apiClient.reactions.add()`, `.remove()`, `.list()`
  - Keep SSE stream endpoint using legacy route (oRPC does not support SSE)

- [ ] **T039** Add deprecation notices to legacy reactions route (non-SSE endpoints only)
  - File: `/workspaces/atrarium/server/src/routes/reactions.ts`
  - Add JSDoc `@deprecated` for add/remove/list
  - Keep `/api/reactions/stream/:communityId` as legacy route (no deprecation)

---

## Phase 5: Moderation Fix Validation

### 5.1 Contract & Integration Tests
- [ ] **T040** [P] Contract test: GET /api/moderation/actions (with communityUri)
  - File: `/workspaces/atrarium/server/tests/contract/moderation/list.test.ts`
  - Test communityUri parameter filtering
  - Test admin-only permission
  - Validate ModerationActionListOutputSchema

- [ ] **T041** Integration test: Moderation list with communityUri (Scenario 4 from quickstart.md)
  - File: `/workspaces/atrarium/server/tests/integration/moderation/list-by-community.test.ts`
  - Test: Hide post → List moderation actions for community → Verify action returned
  - Reference: quickstart.md lines 334-390

---

## Phase 6: Cleanup & Validation

### 6.1 Full Integration Test
- [ ] **T042** Run full workflow integration test (all scenarios combined)
  - File: `/workspaces/atrarium/scripts/test-orpc-migration.sh`
  - Test sequence: Auth → Create community → Post → React → Moderate
  - Reference: quickstart.md lines 392-486
  - Expected: All endpoints return valid responses, 0 errors

### 6.2 Performance Validation
- [ ] **T043** Performance benchmark: Measure oRPC endpoint latency (p95 < 100ms)
  - File: `/workspaces/atrarium/server/tests/performance/orpc-latency.test.ts`
  - Test all migrated endpoints (Posts 3, Emoji 7, Reactions 3)
  - Validate no regression vs legacy routes
  - Reference: quickstart.md lines 488-512

### 6.3 Code Quality
- [ ] **T044** Run Biome checks and fix all linting/formatting issues (Constitution Principle 7)
  - Command: `pnpm lint && pnpm format`
  - Fix all warnings in `server/src/router.ts`
  - Verify pre-commit hooks pass

- [ ] **T045** Run TypeScript type checks across all workspaces (Constitution Principle 7)
  - Command: `pnpm -r typecheck`
  - Fix all type errors in oRPC handlers

### 6.4 Documentation Updates
- [ ] **T046** [P] Update CLAUDE.md with oRPC migration status
  - File: `/workspaces/atrarium/CLAUDE.md`
  - Add "oRPC Router Implementation" section under Implementation Status
  - Mark legacy routes as deprecated in Project Structure section
  - Add oRPC handler pattern to Common Patterns section

- [ ] **T047** [P] Update server API documentation
  - File: `/workspaces/atrarium/server/API.md` (if exists)
  - Document oRPC endpoints vs legacy routes
  - Add migration timeline (30-day transition period)

### 6.5 Legacy Route Deprecation (30-Day Monitoring Period)
- [ ] **T048** Monitor production logs for legacy route usage (30 days after T012, T029, T039)
  - Command: `wrangler tail --format json | grep 'routes/(posts|emoji|reactions).ts'`
  - Track request count, error rate
  - If usage < 1% and error rate = 0%, proceed to T049

- [ ] **T049** Remove legacy routes (after 30-day monitoring confirms safety)
  - Files to delete:
    - `/workspaces/atrarium/server/src/routes/posts.ts`
    - `/workspaces/atrarium/server/src/routes/emoji.ts`
    - `/workspaces/atrarium/server/src/routes/reactions.ts` (keep SSE stream endpoint)
  - Update `/workspaces/atrarium/server/src/index.ts` to remove legacy route imports
  - Remove legacy route tests (if any)

---

## Dependencies

### Critical Path
```
T001, T002 (Preparation)
    ↓
T003-T005 (Posts Contract Tests)
    ↓
T006-T008 (Posts Implementation)
    ↓
T009-T012 (Posts Integration & Client)
    ↓
T013-T019 (Emoji Contract Tests)
    ↓
T020-T026 (Emoji Implementation)
    ↓
T027-T029 (Emoji Integration & Client)
    ↓
T030-T032 (Reactions Contract Tests)
    ↓
T033-T035 (Reactions Implementation)
    ↓
T036-T039 (Reactions Integration & Client)
    ↓
T040-T041 (Moderation Validation)
    ↓
T042-T043 (Full Integration & Performance)
    ↓
T044-T047 (Code Quality & Docs)
    ↓
T048-T049 (Legacy Deprecation - 30 days later)
```

### Parallelizable Tasks
- **Setup**: T001 [sequential], T002 [parallel]
- **Posts Tests**: T003, T004, T005 [all parallel]
- **Posts Unit Tests**: T010 [parallel with T009]
- **Emoji Tests**: T013-T019 [all parallel]
- **Reactions Tests**: T030-T032 [all parallel]
- **Moderation Test**: T040 [parallel with T041]
- **Code Quality**: T044 [sequential], T045 [sequential], T046-T047 [parallel]

### Blocking Dependencies
- T003-T005 MUST fail before T006-T008 (TDD requirement)
- T013-T019 MUST fail before T020-T026 (TDD requirement)
- T030-T032 MUST fail before T033-T035 (TDD requirement)
- T006-T008 share `server/src/router.ts` (sequential)
- T020-T026 share `server/src/router.ts` (sequential)
- T033-T035 share `server/src/router.ts` (sequential)
- T011, T028, T038 share `client/src/lib/api.ts` (sequential)
- T048 blocks T049 (30-day monitoring period)

---

## Parallel Execution Examples

### Example 1: Launch Posts Contract Tests Together
```bash
# All tests use different files, can run in parallel
Task: "Contract test POST /api/communities/:communityId/posts in server/tests/contract/posts/create.test.ts"
Task: "Contract test GET /api/communities/:communityId/posts in server/tests/contract/posts/list.test.ts"
Task: "Contract test GET /api/posts/:uri in server/tests/contract/posts/get.test.ts"
```

### Example 2: Launch Emoji Contract Tests Together
```bash
# All 7 emoji tests use different files, can run in parallel
Task: "Contract test POST /api/emoji/upload in server/tests/contract/emoji/upload.test.ts"
Task: "Contract test GET /api/emoji/list in server/tests/contract/emoji/list.test.ts"
Task: "Contract test POST /api/communities/:id/emoji/submit in server/tests/contract/emoji/submit.test.ts"
Task: "Contract test GET /api/communities/:id/emoji/pending in server/tests/contract/emoji/pending.test.ts"
Task: "Contract test POST /api/communities/:id/emoji/approve in server/tests/contract/emoji/approve.test.ts"
Task: "Contract test POST /api/communities/:id/emoji/revoke in server/tests/contract/emoji/revoke.test.ts"
Task: "Contract test GET /api/communities/:id/emoji/registry in server/tests/contract/emoji/registry.test.ts"
```

---

## Task Validation Checklist
*GATE: Checked before marking plan complete*

- [x] All 14 contracts have corresponding test tasks (T003-T005, T013-T019, T030-T032, T040)
- [x] All 4 entities already exist in Lexicon schemas (no new model tasks needed)
- [x] All contract tests come before implementation (T003-T005 → T006-T008, etc.)
- [x] Parallel tasks truly independent (contract tests use different files)
- [x] Each task specifies exact file path (all tasks include absolute paths)
- [x] No task modifies same file as another [P] task (router handlers sequential)
- [x] Integration tests reference quickstart.md scenarios (T009, T027, T036, T041)
- [x] Performance validation included (T043)
- [x] Constitution compliance validated (T001 for Principle 8, T044-T045 for Principle 7)

---

## Completion Criteria (Constitution Principle 10)
*Complete Implementation Over MVP Excuses*

Each task MUST be fully completed before being marked as done:
- [ ] All 14 contract tests written and passing (not skipped)
- [ ] All 13 oRPC handlers fully implemented (not mocked)
- [ ] All error handling paths implemented (not TODO comments)
- [ ] All validation logic implemented via Zod schemas (not deferred)
- [ ] All client API calls migrated to oRPC (not placeholders)
- [ ] All integration tests passing (not "Phase 2" deferrals)
- [ ] Performance targets met (p95 < 100ms, < 10% regression)
- [ ] Code quality checks passing (Biome + TypeScript)

**Acceptable Deferrals** (tracked as separate tasks):
- Legacy route removal (T048-T049 - requires 30-day monitoring)
- SSE endpoint migration (kept as legacy route indefinitely - oRPC limitation)

**Prohibited Patterns**:
- ❌ "MVP implementation - full validation in Phase 2"
- ❌ "TODO: Add error handling later"
- ❌ "Placeholder oRPC handler - complete after testing"
- ❌ Marking task complete while contract tests are skipped

---

## Notes

### Key Implementation Details
- **oRPC Error Handling**: Use `throw new ORPCError('CODE', { message: '...' })` instead of `c.json({ error }, status)`
  - Common codes: UNAUTHORIZED (401), FORBIDDEN (403), BAD_REQUEST (400), NOT_FOUND (404), CONFLICT (409)
- **Context Extraction**: Always start handlers with `const { env, userDid } = context as ServerContext`
- **PDS Methods**: All required methods already exist in `server/src/services/atproto.ts` (research.md lines 149-167)
- **Validation**: Rely on Zod schemas for automatic validation (20-30% code reduction vs manual checks)
- **SSE Limitation**: oRPC does not support Server-Sent Events - keep `/api/reactions/stream/:communityId` as legacy Hono route

### Migration Strategy
- **Phased Approach**: Posts (Week 1) → Emoji (Week 2) → Reactions (Week 3)
- **Backward Compatibility**: Both legacy and oRPC endpoints active during 30-day transition period
- **Zero Downtime**: Gradual client migration with rollback safety
- **Monitoring**: Track legacy route usage before removal (T048)

### Testing Strategy
- **TDD**: Write failing contract tests before implementation (Constitution Principle 10)
- **Contract Tests**: Validate input/output schemas match oRPC contract
- **Integration Tests**: Validate end-to-end flows (PDS write → Firehose → DO indexing)
- **Performance Tests**: Ensure no regression vs legacy routes (< 10% increase)

### Constitution Compliance
- **Principle 7**: T044-T045 enforce Biome linting, TypeScript type checks
- **Principle 8**: T001 validates PDS-only storage (no separate databases)
- **Principle 10**: All tasks must be fully completed (no MVP excuses)

---

## References

- **Implementation Plan**: `/workspaces/atrarium/specs/018-api-orpc/plan.md`
- **Research Findings**: `/workspaces/atrarium/specs/018-api-orpc/research.md`
- **Data Model**: `/workspaces/atrarium/specs/018-api-orpc/data-model.md`
- **Validation Scenarios**: `/workspaces/atrarium/specs/018-api-orpc/quickstart.md`
- **Contract Definitions**: `/workspaces/atrarium/shared/contracts/src/router.ts` (lines 312-431)
- **Existing oRPC Implementations**: `/workspaces/atrarium/server/src/router.ts` (lines 20-694)
- **PDS Service**: `/workspaces/atrarium/server/src/services/atproto.ts`
- **Constitution**: `/workspaces/atrarium/.specify/memory/constitution.md`

---

*Generated by /tasks command - Ready for /implement execution*
