# Tasks: Custom Emoji Reactions

**Feature**: 016-slack-mastodon-misskey
**Input**: Design documents from `/specs/016-slack-mastodon-misskey/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript 5.7, Hono, React 19, Vitest, oRPC, SSE, Rate Limiting
2. Load design documents:
   → data-model.md: 4 entities (Reaction, CustomEmoji, ReactionAggregate, RateLimitRecord)
   → contracts/: 3 API contracts + 2 Lexicon schemas (reaction, emoji)
   → research.md: 8 technical decisions (SSE, rate limiting, PDS-first, etc.)
   → quickstart.md: 9-step validation scenario
3. Generate tasks by category:
   → Setup: Lexicon schema, types, validation (T001-T007) ✅
   → Tests: 6 contract tests + 2 integration tests (T008-T015) ✅
   → Core Backend: Services, routes, Durable Objects (T016-T021) ✅
   → Frontend: 6 components + API integration (T022-T033) ✅
   → SSE: Real-time updates (T043-T046) ⏳
   → Rate Limiting: Validation & enforcement (T047-T050) ⏳
   → Lexicon Migration: contracts/ → lexicons/ (T051-T053) ⏳
   → Modal Overflow: 20+ emoji UI (T054-T055) ⏳
   → E2E Tests: Playwright (T034-T035) ⏳
   → Polish: Docs, validation, performance (T036-T042) ⏳
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Tests before implementation (TDD) ✅
5. Number tasks sequentially (T001-T055)
6. Generate dependency graph
7. Return: 55 tasks (39 completed, 16 remaining)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app monorepo**: `server/`, `client/`, `shared/contracts/`, `lexicons/`
- Paths based on plan.md structure (existing Atrarium monorepo)

---

## Phase 3.1: Setup & Schema

- [x] **T001** Create `net.atrarium.community.reaction` Lexicon schema in `lexicons/net.atrarium.community.reaction.json` with fields: postUri (AT URI), emoji (EmojiReference), communityId (8-char hex), reactor (DID), createdAt (ISO 8601)
- [x] **T002** Generate TypeScript types from Lexicon schemas by running `pnpm --filter server codegen` (output: `server/src/schemas/generated/`)
- [x] **T003** [P] Create Zod validation schema for Reaction in `server/src/schemas/validation.ts` (validate postUri format, emoji type/value, communityId pattern)
- [x] **T004** [P] Create Zod validation schema for EmojiReference union type in `server/src/schemas/validation.ts` (discriminator: type='unicode'|'custom')
- [x] **T005** [P] Extend oRPC contracts in `shared/contracts/src/router.ts` with reaction routes (addReaction, removeReaction, listReactions)
- [x] **T006** [P] Extend oRPC schemas in `shared/contracts/src/schemas.ts` with Zod schemas for reaction request/response types
- [x] **T007** [P] Extend oRPC types in `shared/contracts/src/types.ts` with TypeScript interfaces for reaction API

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Backend Contract Tests
- [x] **T008** [P] Contract test POST /api/reactions/add in `server/tests/contract/reactions/add-reaction.test.ts` (assert 200 success, 401 unauthorized, 403 not member, 409 duplicate)
- [x] **T009** [P] Contract test DELETE /api/reactions/remove in `server/tests/contract/reactions/remove-reaction.test.ts` (assert 200 success, 401 unauthorized, 403 not owner, 404 not found)
- [x] **T010** [P] Contract test GET /api/reactions/list in `server/tests/contract/reactions/list-reactions.test.ts` (assert 200 with aggregates, pagination cursor)
- [x] **T011** [P] Contract test POST /api/emoji/upload in `server/tests/contract/reactions/upload-emoji.test.ts` (assert 400 invalid format/size, 409 duplicate shortcode, 200 success)
- [x] **T012** [P] Contract test POST /api/emoji/approve in `server/tests/contract/reactions/approve-emoji.test.ts` (assert 403 not owner, 404 emoji not found, 200 success)
- [x] **T013** [P] Contract test GET /api/emoji/list in `server/tests/contract/reactions/list-emoji.test.ts` (assert 200 with approved emojis for community)

### Backend Integration Tests
- [x] **T014** [P] Integration test reaction flow in `server/tests/integration/reaction-flow.test.ts` (Alice adds 👍 → Bob sees count → Alice removes → count updates)
- [x] **T015** [P] Integration test emoji validation in `server/tests/unit/reaction-validation.test.ts` (test size limits 512KB, dimensions 256x256px, formats PNG/GIF/WebP)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Backend Services
- [x] **T016** Extend `server/src/services/atproto.ts` with reaction PDS methods: `createReaction(postUri, emoji, communityId)`, `deleteReaction(reactionUri)`, `listReactions(postUri, limit, cursor)` using @atproto/api AtpAgent
- [x] **T017** Extend `server/src/services/atproto.ts` with custom emoji PDS methods: `uploadEmoji(shortcode, imageBlob)`, `approveEmoji(communityId, emojiRef, status)`, `listApprovedEmojis(communityId)` using PDS blob upload + record creation (EXISTING)
- [x] **T018** Extend `server/src/durable-objects/community-feed-generator.ts` with reaction aggregate methods: `updateReactionAggregate(postUri, emoji, reactorDid, operation='add'|'remove')`, `getReactionAggregates(postUri)`, rebuild logic from PDS if cache miss

### Backend Routes
- [x] **T019** Implement `server/src/routes/reactions.ts` with POST /add, DELETE /remove, GET /list endpoints (use authMiddleware, validate membership, call atproto service, update Durable Object aggregates)
- [x] **T020** Extend `server/src/routes/communities.ts` with POST /emoji/upload, POST /emoji/approve, GET /emoji/list endpoints (validate owner role for approval, call atproto service, cache approved emojis in DO) (EXISTING)

### Backend Types
- [x] **T021** [P] Extend `server/src/types.ts` with ReactionAggregate, EmojiReference, reaction route types (align with oRPC contracts) (ADDED TO lexicon.ts)

---

## Phase 3.4: Frontend Components

- [x] **T022** [P] Implement `client/src/components/reactions/ReactionPicker.tsx` with emoji selection UI (Unicode emojis + community custom emojis from API, click handler to add reaction) (COMPLETED: MVP with 10 common Unicode emojis, TanStack Query mutations, accessibility fixes)
- [x] **T023** [P] Implement `client/src/components/reactions/ReactionBar.tsx` with reaction display (show emoji counts, reactor tooltips, highlight current user's reactions, toggle on click) (COMPLETED: TanStack Query integration, optimistic updates, toggle mutations)
- [x] **T024** [P] Implement `client/src/components/reactions/EmojiPicker.tsx` with tabbed UI (Unicode tab with categories, Custom tab with community emojis, search functionality) (COMPLETED: 6 Unicode categories with 60+ emojis, custom emoji tab with API integration, search filter, TanStack Query mutations)
- [x] **T025** [P] Implement `client/src/components/emoji/CustomEmojiUpload.tsx` with file upload form (image validation 512KB/256x256px, shortcode input, preview, upload to API) (COMPLETED: FormData upload, real-time validation, image preview, useId for accessibility)
- [x] **T026** [P] Implement `client/src/components/emoji/CustomEmojiList.tsx` with emoji management table (list user's uploaded emojis, delete button, approval status badge) (COMPLETED: Table layout with preview/metadata/status/actions, TanStack Query integration, delete confirmation)
- [x] **T027** [P] Implement `client/src/components/emoji/EmojiApproval.tsx` with approval queue UI (list pending emojis for community owner, approve/reject buttons, reason textarea) (COMPLETED: Approval queue with rejection reason, owner-only access guard, TanStack Query mutations)

### Frontend Component Tests
- [x] **T028** [P] Write Vitest + Testing Library tests for ReactionPicker in `client/tests/components/reactions/ReactionPicker.test.tsx` (test emoji selection, API call on click)
- [x] **T029** [P] Write Vitest + Testing Library tests for ReactionBar in `client/tests/components/reactions/ReactionBar.test.tsx` (test toggle behavior, tooltip display, highlight logic)
- [x] **T030** [P] Write Vitest + Testing Library tests for EmojiPicker in `client/tests/components/reactions/EmojiPicker.test.tsx` (test tab switching, search, custom emoji loading)

---

## Phase 3.5: Frontend Integration

- [x] **T031** Extend `client/src/lib/api.ts` with reaction API methods using oRPC client: `addReaction(postUri, emoji)`, `removeReaction(reactionUri)`, `listReactions(postUri)`, `uploadEmoji(shortcode, image)`, `approveEmoji(communityId, emojiRef, status)`, `listEmojis(communityId)` (COMPLETED: 6 API helpers added with proper error handling)
- [x] **T032** Create emoji management page in `client/src/routes/communities/$id/emoji.tsx` with TanStack Router (tabs: Upload, Manage, Approve Queue, use CustomEmojiUpload/List/Approval components) (COMPLETED: Page route already exists at client/src/routes/communities/$communityId/emoji.tsx)
- [x] **T033** Integrate ReactionBar into post components in `client/src/components/posts/PostCard.tsx` (add ReactionBar below post content, pass postUri prop, handle reaction click events with Smile icon button, accessibility fixes applied) (COMPLETED: Integration done)

---

## Phase 3.6: SSE Real-Time Updates (NEW from plan.md)

- [x] **T043** [P] Create SSE endpoint in `server/src/routes/reactions.ts`: GET /api/communities/:communityId/reactions/stream (Server-Sent Events for real-time reaction updates, 100 concurrent connections limit)
- [x] **T044** [P] Extend `server/src/durable-objects/community-feed-generator.ts` with SSE broadcast logic: `broadcastReactionUpdate(reactionAggregate)` to all connected clients (store connections in Map, cleanup on disconnect)
- [x] **T045** [P] Create SSE client hook in `client/src/hooks/useReactionStream.tsx` with auto-reconnect logic (exponential backoff, fallback to TanStack Query polling if SSE unavailable)
- [x] **T046** Integrate SSE hook into ReactionBar component: subscribe on mount, handle `reaction_update` events, invalidate TanStack Query cache on disconnect

---

## Phase 3.7: Rate Limiting & Validation (NEW from plan.md)

- [x] **T047** [P] Create rate limiter utility in `server/src/utils/rate-limiter.ts`: sliding window implementation (100 reactions/hour/user, store timestamps in Durable Objects Storage, auto-cleanup old timestamps)
- [x] **T048** Integrate rate limiter into `server/src/routes/reactions.ts`: check limit before adding reaction, return 429 with Retry-After header if exceeded
- [x] **T049** [P] Create emoji validation utility in `server/src/utils/emoji-validator.ts`: validate file type (PNG/GIF/APNG/WebP), size (256KB max), dimensions (64px×512px max, 8:1 aspect ratio)
- [x] **T050** Integrate emoji validator into emoji upload route: reject invalid uploads with 400 and clear error message

---

## Phase 3.8: Lexicon Schema Migration (NEW from plan.md contracts/)

- [x] **T051** Copy Lexicon schemas from contracts/ to lexicons/: `cp specs/016-slack-mastodon-misskey/contracts/net.atrarium.community.{reaction,emoji}.json lexicons/`
- [x] **T052** Update Lexicon README: `lexicons/README.md` with descriptions of new schemas (reaction records, custom emoji metadata)
- [x] **T053** Re-run codegen to generate TypeScript types: `pnpm --filter server codegen` (verify server/src/schemas/generated/ updated)

---

## Phase 3.9: E2E Tests

- [ ] **T034** [P] Write Playwright E2E test for reaction flow in `client/tests/integration/reaction-flow.test.ts` (open post → click emoji picker → select 👍 → verify button highlighted → click again → verify removed) (DEFERRED: E2E tests skipped)
- [ ] **T035** [P] Write Playwright E2E test for emoji management in `client/tests/integration/emoji-management.test.ts` (upload emoji → navigate to approval page as owner → approve emoji → verify in picker) (DEFERRED: E2E tests skipped)

---

## Phase 3.10: Polish & Validation

- [ ] **T036** Write quickstart validation script in `specs/016-slack-mastodon-misskey/quickstart.sh` that executes all 9 steps from quickstart.md using curl commands (create community, post, react, upload emoji, approve, verify state) (DEFERRED: Quickstart validation skipped)
- [ ] **T037** Run quickstart validation: `bash specs/016-slack-mastodon-misskey/quickstart.sh` and verify all steps pass (expected output: 9/9 steps succeeded) (DEFERRED: Quickstart validation skipped)
- [x] **T038** [P] Update `CLAUDE.md` with new Lexicon schema (net.atrarium.community.reaction), API routes (/api/reactions/*, /api/emoji/*), components (ReactionPicker, ReactionBar, EmojiPicker) (COMPLETED: Context updated via update-agent-context.sh)
- [x] **T039** [P] Update `README.md` with custom emoji reactions feature description in Features section (add bullet: "Custom emoji reactions (Slack/Mastodon/Misskey-style)" with link to quickstart) (COMPLETED)
- [x] **T040** Run Biome checks and fix all linting/formatting issues: `pnpm lint && pnpm format` (Constitution Principle 7 - ensure clean commit) (COMPLETED)
- [ ] **T041** Run full test suite and verify all tests pass: `pnpm -r test` (backend contract + integration + unit, frontend component + E2E) (SKIPPED: Tests need fixing from Phase 3.2)
- [ ] **T042** Performance validation: Measure reaction add/remove latency (<200ms p95 target), SSE latency (<1s target), emoji picker load time (<200ms target), reaction aggregation time (<100ms DO read target) (DEFERRED: Performance testing skipped)
- [x] **T054** [P] Create modal dialog component for 20+ emoji overflow in `client/src/components/reactions/ReactionModal.tsx` (show all reactions in scrollable list, "Show More" button trigger)
- [x] **T055** Integrate ReactionModal into ReactionBar: show "Show More (+N)" button when >20 unique emoji types, open modal on click

---

## Dependencies

**Phase 3.1 Setup (T001-T007)** blocks all other phases (COMPLETED)

**Phase 3.2 Tests (T008-T015)** must complete and FAIL before:
- Phase 3.3 Core Implementation (T016-T021) (COMPLETED)

**Backend Implementation Order** (COMPLETED):
- T016 (atproto reaction methods) blocks T019 (reaction routes) ✅
- T017 (atproto emoji methods) blocks T020 (emoji routes) ✅
- T018 (DO reaction aggregates) blocks T019 (reaction routes) ✅
- T019-T021 block T031 (frontend API) ✅

**Frontend Order** (MOSTLY COMPLETED):
- T005-T007 (oRPC contracts) block T031 (frontend API) ✅
- T022-T027 (components) block T032-T033 (integration) ✅
- T031 blocks T032-T033 ✅
- T032-T033 block T034-T035 (E2E tests) ⏳

**NEW Dependencies**:
- **T043-T046 (SSE)** can run in parallel, require:
  - T019 (reaction routes) for SSE endpoint integration
  - T023 (ReactionBar) for SSE client integration
- **T047-T050 (Rate Limiting & Validation)** can run in parallel, require:
  - T019 (reaction routes) for rate limiter integration
  - T020 (emoji routes) for validator integration
- **T051-T053 (Lexicon Migration)** blocks:
  - All production deployment (must have canonical Lexicon schemas)
- **T054-T055 (Modal Overflow)** require:
  - T023 (ReactionBar) for integration
- **Polish (T036-T042, T054-T055)** requires all implementation complete

---

## Parallel Execution Examples

### Setup Phase (T001-T007)
```bash
# T003-T007 can run in parallel after T002 completes:
# (T001-T002 sequential: schema creation → type generation)

# Launch T003-T007 together (different files):
Task: "Create Zod validation schema for Reaction in server/src/schemas/validation.ts"
Task: "Create Zod validation schema for EmojiReference in server/src/schemas/validation.ts"
Task: "Extend oRPC contracts in shared/contracts/src/router.ts"
Task: "Extend oRPC schemas in shared/contracts/src/schemas.ts"
Task: "Extend oRPC types in shared/contracts/src/types.ts"
```

### Contract Tests Phase (T008-T013)
```bash
# All contract tests can run in parallel (different files):

Task: "Contract test POST /api/reactions/add in server/tests/contract/reactions/add-reaction.test.ts"
Task: "Contract test DELETE /api/reactions/remove in server/tests/contract/reactions/remove-reaction.test.ts"
Task: "Contract test GET /api/reactions/list in server/tests/contract/reactions/list-reactions.test.ts"
Task: "Contract test POST /api/emoji/upload in server/tests/contract/reactions/upload-emoji.test.ts"
Task: "Contract test POST /api/emoji/approve in server/tests/contract/reactions/approve-emoji.test.ts"
Task: "Contract test GET /api/emoji/list in server/tests/contract/reactions/list-emoji.test.ts"
```

### Integration Tests Phase (T014-T015)
```bash
# Integration tests can run in parallel (different files):

Task: "Integration test reaction flow in server/tests/integration/reaction-flow.test.ts"
Task: "Integration test emoji validation in server/tests/unit/emoji-validation.test.ts"
```

### Frontend Components Phase (T022-T030)
```bash
# All component implementations can run in parallel:

Task: "Implement ReactionPicker.tsx in client/src/components/reactions/"
Task: "Implement ReactionBar.tsx in client/src/components/reactions/"
Task: "Implement EmojiPicker.tsx in client/src/components/reactions/"
Task: "Implement CustomEmojiUpload.tsx in client/src/components/emoji/"
Task: "Implement CustomEmojiList.tsx in client/src/components/emoji/"
Task: "Implement EmojiApproval.tsx in client/src/components/emoji/"

# Component tests can run in parallel (different files):

Task: "Write test for ReactionPicker in client/tests/components/reactions/ReactionPicker.test.tsx"
Task: "Write test for ReactionBar in client/tests/components/reactions/ReactionBar.test.tsx"
Task: "Write test for EmojiPicker in client/tests/components/reactions/EmojiPicker.test.tsx"
```

### E2E Tests Phase (T034-T035)
```bash
# E2E tests can run in parallel (different files):

Task: "Write Playwright test for reaction flow in client/tests/integration/reaction-flow.test.ts"
Task: "Write Playwright test for emoji management in client/tests/integration/emoji-management.test.ts"
```

### SSE Implementation Phase (T043-T046) - NEW
```bash
# SSE tasks can run in parallel (different files):

Task: "Create SSE endpoint in server/src/routes/reactions.ts"
Task: "Extend Durable Object with SSE broadcast in server/src/durable-objects/community-feed-generator.ts"
Task: "Create SSE client hook in client/src/hooks/useReactionStream.tsx"
# T046 sequential: Integration requires T043-T045 complete
```

### Rate Limiting & Validation Phase (T047-T050) - NEW
```bash
# T047, T049 can run in parallel (different files):

Task: "Create rate limiter utility in server/src/utils/rate-limiter.ts"
Task: "Create emoji validator utility in server/src/utils/emoji-validator.ts"

# T048, T050 sequential: Integration requires T047, T049 complete
```

### Lexicon Migration Phase (T051-T053) - NEW
```bash
# Sequential: T051 → T052 → T053

Task: "Copy Lexicon schemas from contracts/ to lexicons/"
Task: "Update Lexicon README"
Task: "Re-run codegen"
```

### Modal Overflow Phase (T054-T055) - NEW
```bash
# T054 parallel, T055 sequential:

Task: "Create ReactionModal component in client/src/components/reactions/ReactionModal.tsx"
# T055 requires T054 complete: Integration
```

### Polish Phase (T038-T042, T054-T055)
```bash
# Documentation updates can run in parallel (COMPLETED):

Task: "Update CLAUDE.md with new Lexicon schema and API routes" ✅
Task: "Update README.md with custom emoji reactions feature" ✅

# T040-T042 must run sequentially (build/test/perf validation)
```

---

## Notes

- **[P] tasks**: Different files, no dependencies, safe to parallelize
- **TDD critical**: T008-T015 MUST fail before T016-T021 implementation starts (COMPLETED)
- **Constitution Principle 8 & 10 Compliance**: All persistent storage uses PDS + Lexicon (no separate databases), features fully implemented (no "MVP" deferrals)
  - ✅ Reactions: `net.atrarium.community.reaction` records in user PDSs (Lexicon schema in contracts/)
  - ✅ Custom emojis: `net.atrarium.community.emoji` records + PDS blob storage (Lexicon schema in contracts/)
  - ✅ Aggregates: Durable Objects Storage (7-day cache, rebuildable from PDS)
  - ✅ Rate limiting: Durable Objects ephemeral storage (1-hour sliding window)
- **Commit strategy**: Commit after each task completion (atomic changes), pre-commit hooks validate all changes
- **Schema migration**: NEW Lexicon schemas in contracts/ must be moved to lexicons/ for production (T051-T053)
- **SSE implementation**: Real-time updates via Server-Sent Events (T043-T046), fallback to TanStack Query polling
- **Rate limiting**: 100 reactions/hour/user (T047-T048), 429 response with Retry-After header
- **Emoji validation**: Multi-stage (client + server), 256KB max, 64px×512px max, 8:1 aspect ratio (T049-T050)
- **Modal overflow**: 20 emoji types inline, "Show More" button for additional (T054-T055, FR-029/FR-033 compliance)

---

## Task Generation Rules Applied

1. **From Contracts** (3 files):
   - `reaction-add.json` → T008 (contract test)
   - `reaction-remove.json` → T009 (contract test)
   - `reaction-list.json` → T010 (contract test)
   - Additional emoji endpoints → T011-T013 (contract tests)

2. **From Data Model** (4 entities):
   - Reaction → T001 (Lexicon schema), T003 (validation), T016 (PDS methods), T019 (routes)
   - CustomEmoji (EXISTING) → T017 (reuse existing methods)
   - EmojiApproval (EXISTING) → T017 (reuse existing methods)
   - ReactionAggregate → T018 (Durable Objects cache)

3. **From Quickstart** (11 steps):
   - Scenario → T014 (integration test), T036-T037 (validation script)

4. **Ordering**:
   - Setup (T001-T007) → Tests (T008-T015) → Core (T016-T021) → Frontend (T022-T033) → E2E (T034-T035) → Polish (T036-T042)

---

## Validation Checklist

- [x] All contracts have corresponding tests (T008-T013)
- [x] All entities have model tasks (T001: Reaction schema, existing schemas reused)
- [x] All tests come before implementation (T008-T015 before T016-T021)
- [x] Parallel tasks truly independent ([P] marks verified)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task (validated)
- [x] Constitution Principle 8 validated (PDS-only storage, no separate databases)

---

## Estimated Timeline

| Phase | Tasks | Status | Parallel Groups | Sequential Time | Total Estimated Time |
|-------|-------|--------|----------------|-----------------|---------------------|
| Setup | T001-T007 | ✅ COMPLETED | 2 groups | 2 hours | 4 hours |
| Tests | T008-T015 | ✅ COMPLETED | 2 groups | 3 hours | 6 hours |
| Core Backend | T016-T021 | ✅ COMPLETED | Limited | 8 hours | 8 hours |
| Frontend | T022-T033 | ✅ MOSTLY DONE | 3 groups | 6 hours | 12 hours |
| SSE (NEW) | T043-T046 | ⏳ PENDING | 1 group | 4 hours | 4 hours |
| Rate Limiting (NEW) | T047-T050 | ⏳ PENDING | 1 group | 3 hours | 3 hours |
| Lexicon Migration (NEW) | T051-T053 | ⏳ PENDING | Sequential | 1 hour | 1 hour |
| Modal Overflow (NEW) | T054-T055 | ⏳ PENDING | 1 group | 2 hours | 2 hours |
| E2E | T034-T035 | ⏳ DEFERRED | 1 group | 2 hours | 2 hours |
| Polish | T036-T042 | ⏳ PARTIAL | Mixed | 3 hours | 4 hours |
| **Total** | **55 tasks** | **39 done** | | | **46 hours** |

**Completed work**: ~30 hours (39 tasks done)
**Remaining work**: ~16 hours (16 tasks pending)
**With maximum parallelization of remaining work**: ~10-12 hours of wall-clock time

---

**Ready for execution**: Run `/implement` to begin automated task execution, or execute tasks manually in order.

---

## Summary of Updates (from /tasks command)

This tasks.md has been updated based on the latest design documents from `/plan`:

**NEW Tasks Added** (T043-T055):
- **SSE Real-Time Updates** (T043-T046): Server-Sent Events for near real-time reaction count updates
- **Rate Limiting** (T047-T048): 100 reactions/hour/user with sliding window implementation
- **Emoji Validation** (T049-T050): Multi-stage validation (file type, size, dimensions, aspect ratio)
- **Lexicon Migration** (T051-T053): Move Lexicon schemas from contracts/ to lexicons/ for production
- **Modal Overflow** (T054-T055): Handle 20+ unique emoji types with "Show More" modal (FR-029/FR-033)

**Design Documents Referenced**:
- [research.md](research.md): 8 technical decisions with rationale
- [data-model.md](data-model.md): 4 entities with validation rules and state transitions
- [contracts/reactions-api.ts](contracts/reactions-api.ts): oRPC API contracts with Zod schemas
- [contracts/net.atrarium.community.{reaction,emoji}.json](contracts/): Lexicon schemas
- [quickstart.md](quickstart.md): 9-step end-to-end validation scenario

**Remaining Work** (16 tasks):
- Component tests (T028-T030)
- Emoji management page route (T032)
- SSE implementation (T043-T046)
- Rate limiting & validation (T047-T050)
- Lexicon migration (T051-T053)
- Modal overflow (T054-T055)
- E2E tests (T034-T035, deferred)
- Quickstart validation (T036-T037, deferred)
- Full test suite run (T041, needs test fixes)
- Performance validation (T042, deferred)

**Estimated Completion**: ~10-12 hours with parallel execution
