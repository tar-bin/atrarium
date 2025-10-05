
# Implementation Plan: PDS-First Data Architecture

**Branch**: `006-pds-1-db` | **Date**: 2025-10-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-pds-1-db/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded, all clarifications resolved
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type: Web (Workers + Dashboard)
   → Set Structure Decision: Backend-focused (Workers) + Dashboard (React)
3. Fill the Constitution Check section
   → ⚠️ No constitution.md exists, using Atrarium project principles from CLAUDE.md
4. Evaluate Constitution Check section
   → AT Protocol compliance is PRIMARY goal (not a violation)
   → Update Progress Tracking: Initial Constitution Check ✅
5. Execute Phase 0 → research.md
   → Research AT Protocol Lexicon schemas, PDS record storage, Firehose integration
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update
   → Define Lexicon schemas for CommunityConfig, MembershipRecord, ModerationAction
   → Update data model to show PDS-first architecture
7. Re-evaluate Constitution Check section
   → Verify no new violations after design
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
This feature migrates Atrarium from a centralized D1-dependent architecture to a PDS-first decentralized design. Community configurations, membership records, and moderation decisions will be stored in users' personal data stores (PDSs) as AT Protocol records, with the Feed Generator maintaining only a temporary cache/index for performance. This ensures data sovereignty, enables multiple independent Feed Generators, and aligns with AT Protocol's decentralization principles. Performance is explicitly de-prioritized in favor of protocol compliance.

## Technical Context
**Language/Version**: TypeScript 5.7, Node.js (via nodejs_compat flag)
**Primary Dependencies**: @atproto/api ^0.13.35, @atproto/identity ^0.4.3, Hono ^4.6.14, Zod ^3.23.8
**Storage**:
  - PDS (AT Protocol Personal Data Server) - SOURCE OF TRUTH
  - Cloudflare Durable Objects Storage - PRIMARY index/cache (community-specific)
  - Cloudflare Queues - Event buffering and async processing (5,000 msg/sec)
  - Cloudflare D1 (SQLite) - REMOVED (replaced by Durable Objects Storage)
  - Cloudflare KV - REMOVED (Durable Objects Storage handles caching)
**Testing**: Vitest 2.1.8 + @cloudflare/vitest-pool-workers 0.5.30
**Target Platform**: Cloudflare Workers (Edge Runtime)
**Project Type**: Web (Workers backend + React dashboard)
**Performance Goals**: De-prioritized; AT Protocol compliance is primary goal
**Constraints**:
  - MUST store data in PDS whenever possible
  - Durable Objects Storage is cache ONLY, NOT source of truth
  - MUST sync via Firehose WebSocket in real-time
  - MUST support multiple independent Feed Generators
  - MUST handle PDS unavailability gracefully (stale cache)
  - MUST NOT depend on D1 database (removed entirely)
  - Each community MUST have dedicated Durable Object instance
**Scale/Scope**:
  - 3 new Lexicon schemas (CommunityConfig, MembershipRecord, ModerationAction)
  - Firehose integration for real-time PDS record sync via Cloudflare Queues
  - Migration from D1-centric to Queue-based + Durable Objects Storage architecture
  - Existing 8 D1 tables REMOVED (replaced by Durable Objects Storage)
  - Each community runs as independent Durable Object instance
  - 3-tier async architecture: FirehoseReceiver → Queue → FirehoseProcessor → CommunityFeedGenerator
  - Horizontal scaling: unlimited communities without database bottlenecks
  - Throughput: 2,000+ events/sec via Queue buffering and parallel Workers

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No formal constitution.md exists. Applying Atrarium project principles from CLAUDE.md:

### Test-First Development
- [x] **GATE**: Will contract tests be written before implementation?
  - YES: Lexicon schema validation tests, PDS read/write contract tests, Firehose event processing tests
  - Tests will fail until implementation complete (TDD cycle)

### AT Protocol Compliance
- [x] **GATE**: Does this design align with AT Protocol's decentralization principles?
  - YES: This is the PRIMARY GOAL of this feature
  - Moves from centralized D1 to distributed PDS storage
  - Feed Generator becomes a "view" over PDS data, not the authoritative source

### Performance vs. Correctness Trade-off
- [x] **GATE**: Is performance degradation acceptable?
  - YES: Explicitly stated in spec (FR-015)
  - PDS queries may add latency, but correctness/decentralization takes priority

### Backward Compatibility
- [x] **RESOLVED**: Existing D1-dependent code will be replaced
  - **Justification**: No production environment exists, clean slate is acceptable
  - **Migration Strategy**: Complete replacement of D1 with Durable Objects Storage
  - **Impact**: All D1 models, queries, and migrations will be removed

## Project Structure

### Documentation (this feature)
```
specs/006-pds-1-db/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command) - AT Protocol research
├── data-model.md        # Phase 1 output (/plan command) - PDS-first data model
├── quickstart.md        # Phase 1 output (/plan command) - Integration test scenario
├── contracts/           # Phase 1 output (/plan command)
│   ├── lexicon/            # AT Protocol Lexicon schemas (JSON)
│   │   ├── net.atrarium.community.config.json
│   │   ├── net.atrarium.community.membership.json
│   │   └── net.atrarium.moderation.action.json
│   └── tests/              # Contract tests (TypeScript)
│       ├── pds-write-community.test.ts
│       ├── pds-read-membership.test.ts
│       └── firehose-sync.test.ts
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
src/
├── durable-objects/     # 🆕 NEW: Durable Objects (replaces models/)
│   └── community-feed-generator.ts  # Per-community Durable Object with Storage API
├── services/            # Business logic services
│   ├── atproto.ts           # ⚠️ MAJOR CHANGES: Add PDS write/read, Lexicon validation
│   ├── pds-sync.ts          # 🆕 NEW: PDS record synchronization service
│   ├── cache.ts             # ❌ REMOVED: KV cache replaced by Durable Objects Storage
│   └── db.ts                # ❌ REMOVED: D1 utilities no longer needed
├── routes/              # API route handlers
│   ├── communities.ts       # ⚠️ CHANGES: Write to PDS, delegate to Durable Objects
│   ├── memberships.ts       # ⚠️ CHANGES: Write to PDS, query via Durable Objects
│   ├── moderation.ts        # ⚠️ CHANGES: Write moderation to PDS
│   └── feed-generator.ts    # ⚠️ MAJOR CHANGES: Proxy to Durable Objects Storage
├── schemas/             # Validation schemas
│   ├── validation.ts        # Existing Zod schemas (minimal changes)
│   └── lexicon.ts           # 🆕 NEW: AT Protocol Lexicon TypeScript types
├── types.ts             # TypeScript type definitions
│   # ⚠️ CHANGES: Add PDS record types, remove D1 row types
└── index.ts             # Main entry point
    # ⚠️ CHANGES: Durable Objects bindings (no Firehose in Workers)

tests/
├── contract/            # API contract tests
│   ├── pds/                 # 🆕 NEW: PDS integration contract tests
│   │   ├── write-community-config.test.ts
│   │   ├── read-membership.test.ts
│   │   └── firehose-events.test.ts
│   └── ...
├── integration/         # End-to-end integration tests
│   ├── pds-to-feed-flow.test.ts  # 🆕 NEW: PDS write → Firehose → Cache → Feed
│   └── ...
└── unit/                # Unit tests
    ├── lexicon-validation.test.ts  # 🆕 NEW: Lexicon schema validation
    └── ...
```

**Structure Decision**: Web application with Workers backend (src/) and React dashboard (dashboard/). This feature fundamentally changes the Workers architecture by replacing D1 with Durable Objects Storage.

**Migration Strategy**: **Complete architectural replacement** (no production environment exists):
1. Remove all D1 dependencies (schema.sql, migrations/, D1 bindings in wrangler.toml)
2. Remove all KV dependencies (KV bindings in wrangler.toml)
3. Create Durable Objects class: CommunityFeedGenerator
4. Each community becomes a Durable Object instance with dedicated Storage
5. All writes go to PDS → Firehose → Durable Objects Storage pipeline
6. Feed Generator queries Durable Objects Storage directly (no D1)
7. No backward compatibility concerns (development phase only)
8. Horizontal scaling: unlimited communities without database bottlenecks

## Phase 0: Outline & Research

### Research Tasks

1. **AT Protocol Lexicon Schema Design**
   - Question: How to define custom Lexicon schemas for Atrarium records?
   - Research: AT Protocol Lexicon specification, existing community-related schemas
   - Deliverable: Draft Lexicon definitions for CommunityConfig, MembershipRecord, ModerationAction

2. **PDS Record Storage & Retrieval**
   - Question: How to write/read custom records to/from PDS using @atproto/api?
   - Research: @atproto/api repository CRUD methods, authentication requirements
   - Deliverable: Code examples for PDS write/read operations

3. **Firehose Integration Patterns**
   - Question: How to subscribe to Firehose for custom Lexicon events?
   - Research: com.atproto.sync.subscribeRepos specification, event filtering
   - Deliverable: Firehose WebSocket client architecture (must use Durable Objects for persistent connection)

4. **Durable Objects Storage API**
   - Question: How to use Durable Objects Storage for feed index queries?
   - Research: Storage.list() API, key design patterns, range queries
   - Deliverable: Storage key schema design (e.g., `post:{timestamp}:{uri}`)

5. **PDS Unavailability Handling**
   - Question: What are best practices for graceful degradation when PDS is down?
   - Research: Bluesky's approach to PDS outages, cache staleness strategies
   - Deliverable: Fallback strategy (serve stale Durable Objects cache, retry logic, TTL policies)

6. **Conflict Resolution (Last-Write-Wins)**
   - Question: How to implement LWW for moderation decisions from multiple moderators?
   - Research: CRDTs in AT Protocol, timestamp-based conflict resolution
   - Deliverable: LWW implementation approach using `indexedAt` timestamps

7. **Durable Objects Cost Analysis**
   - Question: What are the cost implications of per-community Durable Object instances?
   - Research: Cloudflare pricing for Durable Objects Storage, request costs
   - Deliverable: Cost comparison (D1 vs. Durable Objects) for 100/1000/10000 communities

8. **Cloudflare Queues Integration**
   - Question: How to use Queues to decouple Firehose ingestion from processing?
   - Research: Queue throughput limits, batch processing, consumer patterns, pricing
   - Deliverable: Queue-based architecture design (FirehoseReceiver → Queue → FirehoseProcessor)

9. **Firehose Performance Optimization**
   - Question: How to handle 2,000+ events/sec without blocking WebSocket connection?
   - Research: Batch sending, lightweight vs heavyweight filtering, RPC patterns
   - Deliverable: Performance optimization strategy (includes('#atr_') vs regex)

10. **Multiple Feed Generator Support**
   - Question: How can multiple independent Feed Generators share the same PDS data?
   - Research: AT Protocol's federation model, DID resolution for discovery
   - Deliverable: Discovery mechanism (DID documents, well-known endpoints)

**Output**: [research.md](./research.md) with all decisions documented

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

### Step 1: Data Model (data-model.md)

Update data model to reflect PDS-first architecture:

**PDS Records (Source of Truth)**:
```
CommunityConfig (stored in owner's PDS)
  - $type: net.atrarium.community.config
  - name: string
  - description?: string
  - hashtag: string (#atr_xxxxx)
  - moderators: string[] (DIDs)
  - blocklist: string[] (DIDs)
  - stage: 'theme' | 'community' | 'graduated'
  - feedMix: { own: number, parent: number, global: number }
  - parentCommunity?: string (DID reference)
  - createdAt: ISO 8601 datetime
  - updatedAt: ISO 8601 datetime

MembershipRecord (stored in member's PDS)
  - $type: net.atrarium.community.membership
  - community: string (owner DID reference)
  - role: 'owner' | 'moderator' | 'member'
  - joinedAt: ISO 8601 datetime
  - active: boolean

ModerationAction (stored in moderator's PDS)
  - $type: net.atrarium.moderation.action
  - community: string (owner DID reference)
  - action: 'hide' | 'unhide' | 'block' | 'unblock'
  - target: string (post URI or user DID)
  - reason?: string
  - createdAt: ISO 8601 datetime
```

**Durable Objects Storage (Cache Data)**:
```typescript
// Key schema design for Storage.list() queries
Storage Keys:
  - config:{communityId} → CommunityConfig (from PDS)
  - member:{did} → MembershipRecord (from PDS)
  - post:{createdAt}:{uri} → PostMetadata (from Firehose)
  - moderation:{uri} → ModerationAction (from PDS)
  - cache:members:timestamp → member DID list (5min TTL)

Example:
  post:1704067200000:at://did:plc:abc/app.bsky.feed.post/xyz
```
- No D1 tables (entirely replaced by Durable Objects Storage)
- Each community has isolated storage namespace
- 7-day retention for posts (automatic cleanup)

**Relationships**:
- MembershipRecord.community → references CommunityConfig owner DID
- ModerationAction.community → references CommunityConfig owner DID
- Feed Generator resolves DIDs to fetch community configs

### Step 2: API Contracts (contracts/)

**Lexicon Schemas** (JSON, following AT Protocol spec):
1. `contracts/lexicon/net.atrarium.community.config.json`
2. `contracts/lexicon/net.atrarium.community.membership.json`
3. `contracts/lexicon/net.atrarium.moderation.action.json`

**PDS Integration Contracts** (TypeScript tests):
1. `contracts/tests/pds-write-community.test.ts`
   - POST to PDS with CommunityConfig record
   - Assert record created with correct $type
   - Verify DID resolution

2. `contracts/tests/pds-read-membership.test.ts`
   - Query PDS for membership records by DID
   - Assert schema validation
   - Verify reference integrity (community exists)

3. `contracts/tests/firehose-sync.test.ts`
   - Subscribe to Firehose via Durable Object
   - Emit mock CommunityConfig event
   - Assert Durable Objects Storage updated within TTL

**Existing API Contracts** (updates):
- `POST /api/communities` → writes to PDS, creates Durable Object instance
- `GET /api/communities/:id` → proxies to Durable Object, refreshes from PDS if stale
- `POST /api/memberships` → writes to member's PDS
- `POST /api/moderation/hide` → writes to moderator's PDS
- `GET /xrpc/app.bsky.feed.getFeedSkeleton` → proxies to Durable Object Storage.list()

### Step 3: Integration Test Scenario (quickstart.md)

**Scenario**: Create community, join as member, post to feed, moderate post

```gherkin
Given Alice has a Bluesky account (alice.bsky.social)
When Alice creates a community "Tech Enthusiasts" via dashboard
Then a CommunityConfig record is written to Alice's PDS
  And the record has $type "net.atrarium.community.config"
  And a Durable Object instance is created for this community
  And a Firehose event is emitted
  And the Durable Object caches the config in its Storage

Given Bob has a Bluesky account (bob.bsky.social)
When Bob joins "Tech Enthusiasts" community
Then a MembershipRecord is written to Bob's PDS
  And the record references Alice's DID (community owner)
  And the Firehose event triggers cache update

When Bob posts "Hello #atr_12345678" to Bluesky
Then the Firehose detects the hashtag
  And Bob's membership is verified from Durable Objects Storage
  And the post URI is indexed in Durable Objects Storage (post:{timestamp}:{uri})

When Alice hides Bob's post
Then a ModerationAction is written to Alice's PDS
  And the Firehose event updates Durable Objects Storage (moderation:{uri})
  And the post is excluded from getFeedSkeleton response

When the Durable Object restarts (or crashes)
Then it rebuilds its Storage from PDS records via Firehose
  And all community configs, memberships, moderation actions are restored
  And feed generation continues without data loss
```

### Step 4: Agent Context Update (CLAUDE.md)

Run update script:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

Add to CLAUDE.md:
- New Lexicon schemas (net.atrarium.*)
- PDS-first data flow diagram
- Durable Objects Storage architecture (replaced D1/KV)
- Per-community Durable Object instances
- Firehose integration architecture (WebSocket in Durable Objects)
- Migration strategy (complete removal of D1/KV)
- Performance trade-off notes (compliance > speed)
- Horizontal scaling capabilities (unlimited communities)

**Output**: data-model.md, contracts/, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:

1. **Phase 0 Research Tasks** (T001-T010)
   - One task per research question from Phase 0
   - Each produces a section in research.md
   - T004: Durable Objects Storage API research
   - T007: Cost analysis
   - T008: Cloudflare Queues integration (NEW)
   - T009: Firehose performance optimization (NEW)

2. **Lexicon Schema Definition** (T011-T013)
   - T011: Define net.atrarium.community.config.json [P]
   - T012: Define net.atrarium.community.membership.json [P]
   - T013: Define net.atrarium.moderation.action.json [P]

3. **Contract Tests (Failing)** (T014-T017)
   - T014: Write pds-write-community.test.ts (FAILS) [P]
   - T015: Write pds-read-membership.test.ts (FAILS) [P]
   - T016: Write durable-object-storage.test.ts (FAILS) [P]
   - T017: Write queue-consumer.test.ts (FAILS) [P] (NEW)

4. **PDS Service Implementation** (T018-T021)
   - T018: Extend src/services/atproto.ts with PDS write methods
   - T019: Extend src/services/atproto.ts with PDS read methods
   - T020: Add Lexicon validation (src/schemas/lexicon.ts)
   - T021: PDS contract tests now PASS

5. **Queue and Firehose Implementation** (T022-T027)
   - T022: Create Cloudflare Queue: firehose-events (wrangler.toml) (NEW)
   - T023: Create src/durable-objects/firehose-receiver.ts (WebSocket + batch send) (NEW)
   - T024: Create src/workers/firehose-processor.ts (Queue consumer) (NEW)
   - T025: Implement lightweight filter (includes('#atr_')) in FirehoseReceiver (NEW)
   - T026: Implement heavyweight filter (regex) in FirehoseProcessor (NEW)
   - T027: queue-consumer.test.ts now PASSES (NEW)

6. **Durable Objects Implementation** (T028-T032)
   - T028: Create src/durable-objects/community-feed-generator.ts skeleton
   - T029: Implement Storage key schema (post:{timestamp}:{uri}, member:{did})
   - T030: Implement indexPost() RPC method (called from FirehoseProcessor)
   - T031: Implement getFeedSkeleton() using Storage.list()
   - T032: Implement storage cleanup (7-day retention)

7. **API Route Updates** (T033-T037)
   - T033: Update POST /api/communities → write to PDS, create Durable Object
   - T034: Update POST /api/memberships → write to PDS
   - T035: Update POST /api/moderation/hide → write to PDS
   - T036: Update GET /xrpc/app.bsky.feed.getFeedSkeleton → proxy to Durable Object
   - T037: Update src/index.ts (Durable Objects + Queue bindings)

8. **Cleanup & Migration** (T038-T040)
   - T038: Remove src/models/ (D1 models no longer needed)
   - T039: Remove src/services/db.ts and cache.ts
   - T040: Remove D1/KV bindings from wrangler.toml, add Durable Objects + Queue config

9. **Integration Test** (T041-T042)
   - T041: Write tests/integration/queue-to-feed-flow.test.ts (FAILS)
   - T042: Verify end-to-end flow (Jetstream → Queue → Processor → Community DO)

10. **Documentation** (T043-T044)
   - T043: Update CLAUDE.md via update-agent-context.sh
   - T044: Write quickstart.md scenario validation

**Ordering Strategy**:
- TDD: Tests before implementation (T014-T017 before T018-T027)
- Bottom-up: Lexicon → PDS service → Queue + Firehose → Durable Objects → API routes
- [P] marks indicate parallel execution (independent files)
- Queue infrastructure before Durable Objects (T022-T027 before T028-T032)
- Cleanup phase after all implementation complete

**Output**: 44 numbered tasks (T001-T044) in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following TDD principles)
**Phase 5**: Validation
  - Run contract tests (pds-write, pds-read, durable-object-storage)
  - Run integration test (pds-to-feed-flow)
  - Execute quickstart.md scenario manually
  - Verify D1/KV completely removed from codebase
  - Verify each community has dedicated Durable Object instance
  - Performance baseline (latency increase acceptable per FR-015)
  - Cost analysis validation (Durable Objects vs. D1)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Performance degradation | PDS queries add latency vs. direct D1 access | FR-015 explicitly prioritizes protocol compliance over performance |
| New Lexicon schemas (complexity) | AT Protocol requires formal Lexicon definitions for custom records | Informal JSON schemas would not be discoverable or validatable by other AT Protocol services |
| Durable Objects cost increase | Per-community instances cost more than shared D1 | Horizontal scalability requires isolation; D1 write bottleneck is unacceptable (FR-025) |

**Note**: Complete removal of D1/KV is NOT considered a violation because:
- **No production environment exists** (development/testing phase only)
- Clean slate allows proper PDS-first implementation without technical debt
- Durable Objects Storage eliminates database bottlenecks (FR-022, FR-024, FR-025)
- Simplifies implementation by removing backward compatibility requirements
- Enables unlimited horizontal scaling without performance degradation

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command) - See research.md
- [x] Phase 1: Design complete (/plan command) - See data-model.md, contracts/, quickstart.md
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (no formal constitution, Atrarium principles applied)
- [x] Post-Design Constitution Check: PASS (no new violations, AT Protocol compliance maintained)
- [x] All NEEDS CLARIFICATION resolved (spec already finalized)
- [x] Complexity deviations documented (see Complexity Tracking)

**Artifacts Generated**:
- [x] research.md (Phase 0)
- [x] data-model.md (Phase 1)
- [x] contracts/lexicon/*.json (Phase 1) - 3 Lexicon schemas
- [x] quickstart.md (Phase 1)
- [x] CLAUDE.md updated (Phase 1)

---
*Based on Atrarium project principles from CLAUDE.md - See `/workspaces/atrarium/CLAUDE.md`*
