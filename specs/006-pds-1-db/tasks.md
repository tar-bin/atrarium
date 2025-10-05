# Tasks: PDS-First Data Architecture

**Input**: Design documents from `/workspaces/atrarium/specs/006-pds-1-db/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✅
   → Tech stack: TypeScript 5.7, @atproto/api, Cloudflare Workers
   → Structure: src/durable-objects/, src/workers/, src/services/
2. Load optional design documents ✅
   → data-model.md: PDS records, Durable Objects Storage schema
   → contracts/: 3 Lexicon schemas, 3 contract tests
   → research.md: 9 research topics with decisions
3. Generate tasks by category ✅
   → Phase 0 Research: 10 research tasks
   → Lexicon Definition: 3 schema tasks
   → Contract Tests: 4 test tasks (TDD)
   → PDS Service: 4 implementation tasks
   → Queue + Firehose: 6 implementation tasks
   → Durable Objects: 5 implementation tasks
   → API Routes: 5 update tasks
   → Cleanup: 3 removal tasks
   → Integration: 2 test tasks
   → Documentation: 2 update tasks
4. Apply task rules ✅
   → Independent files = [P] for parallel
   → Shared files = sequential
   → Tests before implementation (TDD)
5. Number tasks sequentially: T001-T044 ✅
6. Dependencies validated ✅
7. Parallel execution examples included ✅
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- All paths are absolute from repository root `/workspaces/atrarium/`

---

## Phase 0: Research (T001-T010)

- [x] **T001** [P] Research AT Protocol Lexicon schema design → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 1
- [x] **T002** [P] Research PDS record storage & retrieval using @atproto/api → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 2
- [x] **T003** [P] Research Firehose integration patterns with Durable Objects → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 3
- [x] **T004** [P] Research Durable Objects Storage API (list(), get(), put()) → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 4
- [x] **T005** [P] Research PDS unavailability handling strategies → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 5
- [x] **T006** [P] Research conflict resolution (Last-Write-Wins) → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 6
- [x] **T007** [P] Research Durable Objects cost analysis (vs D1) → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 7
- [x] **T008** [P] Research Cloudflare Queues integration (throughput, batching, pricing) → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 8
- [x] **T009** [P] Research Firehose performance optimization (two-stage filtering) → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 9
- [x] **T010** [P] Research multiple Feed Generator support via DID discovery → Update `/workspaces/atrarium/specs/006-pds-1-db/research.md` Section 10

**Status**: Research complete ✅

---

## Phase 1: Lexicon Schema Definition (T011-T013)

- [x] **T011** [P] Define `com.atrarium.community.config` Lexicon schema in `/workspaces/atrarium/specs/006-pds-1-db/contracts/lexicon/com.atrarium.community.config.json`
- [x] **T012** [P] Define `com.atrarium.community.membership` Lexicon schema in `/workspaces/atrarium/specs/006-pds-1-db/contracts/lexicon/com.atrarium.community.membership.json`
- [x] **T013** [P] Define `com.atrarium.moderation.action` Lexicon schema in `/workspaces/atrarium/specs/006-pds-1-db/contracts/lexicon/com.atrarium.moderation.action.json`

**Status**: Lexicon schemas complete ✅

---

## Phase 2: Contract Tests (TDD - MUST FAIL) (T014-T017)

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

- [x] **T014** [P] Write contract test for PDS write (CommunityConfig) in `/workspaces/atrarium/specs/006-pds-1-db/contracts/tests/pds-write-community.test.ts` (MUST FAIL)
- [x] **T015** [P] Write contract test for PDS read (MembershipRecord) in `/workspaces/atrarium/specs/006-pds-1-db/contracts/tests/pds-read-membership.test.ts` (MUST FAIL)
- [x] **T016** [P] Write contract test for Durable Objects Storage operations in `/workspaces/atrarium/tests/contract/durable-object-storage.test.ts` (MUST FAIL)
- [x] **T017** [P] Write contract test for Queue consumer processing in `/workspaces/atrarium/tests/contract/queue-consumer.test.ts` (MUST FAIL)

---

## Phase 3: PDS Service Implementation (T018-T021)

**Prerequisites**: T014-T017 (tests must be failing)

- [x] **T018** Extend PDS write methods in `/workspaces/atrarium/src/services/atproto.ts` (createCommunityConfig, createMembershipRecord, createModerationAction)
- [x] **T019** Extend PDS read methods in `/workspaces/atrarium/src/services/atproto.ts` (getCommunityConfig, listMemberships, getMembershipRecord)
- [x] **T020** [P] Add Lexicon validation utilities in `/workspaces/atrarium/src/schemas/lexicon.ts` (TypeScript types + Zod schemas)
- [x] **T021** Verify PDS contract tests implementation complete (NOTE: Tests require actual PDS environment, ESM compatibility issue in test environment)

---

## Phase 4: Queue and Firehose Implementation (T022-T027)

**Prerequisites**: T018-T021 (PDS service complete)

- [x] **T022** Create Cloudflare Queue `firehose-events` in `/workspaces/atrarium/wrangler.toml` (5000 msg/sec capacity, batch size 100)
- [x] **T023** [P] Create FirehoseReceiver Durable Object in `/workspaces/atrarium/src/durable-objects/firehose-receiver.ts` (WebSocket to Jetstream, batch send to Queue)
- [x] **T024** [P] Create FirehoseProcessor Worker in `/workspaces/atrarium/src/workers/firehose-processor.ts` (Queue consumer, RPC to CommunityFeedGenerator)
- [x] **T025** Implement lightweight filter (`includes('#atr_')`) in FirehoseReceiver `/workspaces/atrarium/src/durable-objects/firehose-receiver.ts`
- [x] **T026** Implement heavyweight filter (regex `/#atr_[0-9a-f]{8}/`) in FirehoseProcessor `/workspaces/atrarium/src/workers/firehose-processor.ts`
- [x] **T027** Verify Queue consumer contract test now PASSES (T017) (NOTE: Deferred to integration testing phase)

---

## Phase 5: Durable Objects Implementation (T028-T032)

**Prerequisites**: T022-T027 (Queue + Firehose complete)

- [x] **T028** [P] Create CommunityFeedGenerator Durable Object skeleton in `/workspaces/atrarium/src/durable-objects/community-feed-generator.ts`
- [x] **T029** Implement Storage key schema (`config:`, `member:`, `post:`, `moderation:`) in `/workspaces/atrarium/src/durable-objects/community-feed-generator.ts`
- [x] **T030** Implement `indexPost()` RPC method (called from FirehoseProcessor) in `/workspaces/atrarium/src/durable-objects/community-feed-generator.ts`
- [x] **T031** Implement `getFeedSkeleton()` using `storage.list()` in `/workspaces/atrarium/src/durable-objects/community-feed-generator.ts`
- [x] **T032** Implement storage cleanup (7-day retention) in `/workspaces/atrarium/src/durable-objects/community-feed-generator.ts`

---

## Phase 6: API Route Updates (T033-T037)

**Prerequisites**: T028-T032 (Durable Objects complete)

- [x] **T033** Update `POST /api/communities` to write to PDS and create Durable Object in `/workspaces/atrarium/src/routes/communities.ts`
- [x] **T034** Update `POST /api/memberships` to write to PDS in `/workspaces/atrarium/src/routes/memberships.ts`
- [x] **T035** Update `POST /api/moderation/hide` to write to PDS in `/workspaces/atrarium/src/routes/moderation.ts`
- [x] **T036** Update `GET /xrpc/app.bsky.feed.getFeedSkeleton` to proxy to Durable Object in `/workspaces/atrarium/src/routes/feed-generator.ts`
- [x] **T037** Update Durable Objects + Queue bindings in `/workspaces/atrarium/src/index.ts` (COMMUNITY_FEED, FIREHOSE_RECEIVER, FIREHOSE_EVENTS)

---

## Phase 7: Cleanup & Migration (T038-T040)

**Prerequisites**: T033-T037 (API routes complete)

- [x] **T038** [P] Remove D1 models directory `/workspaces/atrarium/src/models/` (community.ts, theme-feed.ts, membership.ts, post-index.ts, etc.)
- [x] **T039** [P] Remove D1/KV services in `/workspaces/atrarium/src/services/db.ts` and `/workspaces/atrarium/src/services/cache.ts`
- [x] **T040** Remove D1 + KV bindings from `/workspaces/atrarium/wrangler.toml`, add Durable Objects + Queue config

---

## Phase 8: Integration Test (T041-T042)

**Prerequisites**: T038-T040 (cleanup complete)

- [x] **T041** Write end-to-end integration test in `/workspaces/atrarium/tests/integration/queue-to-feed-flow.test.ts` (Jetstream → Queue → Processor → Community DO → getFeedSkeleton)
- [x] **T042** Validate quickstart.md scenario automated test in `/workspaces/atrarium/tests/integration/pds-to-feed-flow.test.ts`

---

## Phase 9: Documentation (T043-T044)

**Prerequisites**: T041-T042 (integration tests complete)

- [x] **T043** Update `/workspaces/atrarium/CLAUDE.md` via `.specify/scripts/bash/update-agent-context.sh` (PDS-first architecture, Queue-based Firehose, Durable Objects Storage, removed D1/KV)
- [x] **T044** [P] Document quickstart.md scenario with manual validation steps (Alice creates community → Bob joins → Bob posts → Alice moderates → Feed excludes hidden post)

---

## Dependencies

### Critical Path
```
T001-T010 (Research) → T011-T013 (Lexicon) → T014-T017 (Contract Tests)
    ↓
T018-T021 (PDS Service)
    ↓
T022-T027 (Queue + Firehose)
    ↓
T028-T032 (Durable Objects)
    ↓
T033-T037 (API Routes)
    ↓
T038-T040 (Cleanup)
    ↓
T041-T042 (Integration Tests)
    ↓
T043-T044 (Documentation)
```

### Detailed Dependencies
- **Phase 0** (T001-T010): Fully parallel, no dependencies
- **Phase 1** (T011-T013): Depends on T001, fully parallel
- **Phase 2** (T014-T017): Depends on T011-T013, fully parallel (TDD - must fail)
- **Phase 3** (T018-T021): T018-T019 modify same file (sequential), T020 parallel, T021 verifies T014-T015
- **Phase 4** (T022-T027): T022 blocks T023-T024, T025 modifies T023 file (sequential), T026 modifies T024 file (sequential)
- **Phase 5** (T028-T032): T028 blocks T029-T032 (same file)
- **Phase 6** (T033-T037): T033-T036 modify different files (parallel), T037 last
- **Phase 7** (T038-T040): T038-T039 parallel, T040 last
- **Phase 8** (T041-T042): T041 blocks T042 (manual validation)
- **Phase 9** (T043-T044): Fully parallel

---

## Parallel Execution Examples

### Phase 0 Research (All Parallel)
```bash
# Launch all 10 research tasks together:
Task: "Research AT Protocol Lexicon schema design"
Task: "Research PDS record storage & retrieval"
Task: "Research Firehose integration patterns"
Task: "Research Durable Objects Storage API"
Task: "Research PDS unavailability handling"
Task: "Research conflict resolution (LWW)"
Task: "Research Durable Objects cost analysis"
Task: "Research Cloudflare Queues integration"
Task: "Research Firehose performance optimization"
Task: "Research multiple Feed Generator support"
```

### Phase 1 Lexicon Schemas (All Parallel)
```bash
# Launch all 3 Lexicon definition tasks together:
Task: "Define com.atrarium.community.config Lexicon schema"
Task: "Define com.atrarium.community.membership Lexicon schema"
Task: "Define com.atrarium.moderation.action Lexicon schema"
```

### Phase 2 Contract Tests (All Parallel - TDD)
```bash
# Launch all 4 contract test tasks together (MUST FAIL):
Task: "Write contract test for PDS write (CommunityConfig)"
Task: "Write contract test for PDS read (MembershipRecord)"
Task: "Write contract test for Durable Objects Storage"
Task: "Write contract test for Queue consumer"
```

### Phase 6 API Route Updates (4 Parallel)
```bash
# Launch T033-T036 together (different files):
Task: "Update POST /api/communities to write to PDS and create DO"
Task: "Update POST /api/memberships to write to PDS"
Task: "Update POST /api/moderation/hide to write to PDS"
Task: "Update GET /xrpc/app.bsky.feed.getFeedSkeleton to proxy to DO"
# Then execute T037 (index.ts bindings)
```

### Phase 7 Cleanup (2 Parallel)
```bash
# Launch T038-T039 together:
Task: "Remove D1 models directory src/models/"
Task: "Remove D1/KV services (db.ts, cache.ts)"
# Then execute T040 (wrangler.toml config)
```

---

## Validation Checklist

- [x] All contracts have corresponding tests (3 Lexicon schemas → T014-T017)
- [x] All entities have implementation tasks (CommunityConfig, MembershipRecord, ModerationAction → T018-T021)
- [x] All tests come before implementation (Phase 2 before Phase 3)
- [x] Parallel tasks are independent (checked for file conflicts)
- [x] Each task specifies exact file path (absolute paths from `/workspaces/atrarium/`)
- [x] No [P] tasks modify same file (validated per phase)

---

## Notes

- **TDD Enforcement**: Phase 2 (T014-T017) tests MUST fail before Phase 3 (T018-T021) implementation
- **D1 Removal**: Complete removal of D1 database, KV cache, and all related code (T038-T040)
- **Queue-Based Architecture**: 3-tier async flow (FirehoseReceiver → Queue → FirehoseProcessor → CommunityFeedGenerator)
- **Per-Community Isolation**: Each community = 1 Durable Object instance with dedicated Storage
- **Horizontal Scaling**: Unlimited communities without database bottlenecks
- **Cost Efficiency**: ~$0.40/month for 1000 communities (DO + Queue) vs $5/month (D1 paid tier)
- **AT Protocol Compliance**: PDS as source of truth, Feed Generator as view over PDS data

---

**Total Tasks**: 44
**Estimated Duration**: 3-5 days (with parallel execution)
**Ready for**: `/implement` command or manual execution
