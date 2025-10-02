# Tasks: Atrarium MVP - Community Management System on AT Protocol

**Feature Branch**: `001-`
**Input**: Design documents from `/workspaces/atrarium/specs/001-/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/
**Tech Stack**: TypeScript, Cloudflare Workers, D1, KV, Hono, zod, vitest

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Extract: TypeScript, Cloudflare Workers, Hono, zod, vitest
   → Project structure: src/ (Workers backend), dashboard/ (React frontend)
2. Load design documents:
   → data-model.md: 6 entities (communities, theme_feeds, memberships, post_index, owner_transition_log, achievements)
   → contracts/feed-generator-api.yaml: 3 AT Protocol endpoints
   → contracts/dashboard-api.yaml: Auth, Communities, Theme Feeds, Memberships, Posts
   → quickstart.md: 6 validation scenarios
3. Generate tasks by category:
   → Setup: Cloudflare project init, D1 schema, dependencies
   → Tests: Contract tests for 8 endpoints, integration tests for 6 scenarios
   → Core: 6 models, 5 services, 8 route handlers
   → Integration: DB layer, auth middleware, cache layer
   → Polish: Unit tests, performance validation, documentation
4. Apply task rules:
   → Different files = mark [P] for parallel execution
   → Same file (e.g., src/index.ts) = sequential
   → Tests before implementation (TDD)
   → Models → Services → Routes
5. Validate: All contracts tested, all entities modeled, all scenarios covered
6. Return: 42 ordered tasks ready for execution
```

## Path Conventions
- **Backend**: `src/` at repository root (Cloudflare Workers)
- **Database**: `schema.sql`, `wrangler.toml`
- **Frontend**: `dashboard/` (React SPA, Phase 0 Week 13+)
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/unit/`

---

## Phase 3.1: Setup & Infrastructure (T001-T006)

- [x] **T001** Create project structure per plan.md (src/, tests/, schema.sql, wrangler.toml)
  - Files: `src/index.ts`, `tests/contract/`, `tests/integration/`, `tests/unit/`, `schema.sql`, `wrangler.toml`
  - Initialize: TypeScript config, package.json with dependencies
  - Verify: Directory structure matches plan.md:104-161

- [x] **T002** Initialize TypeScript project with Cloudflare Workers dependencies
  - Files: `package.json`, `tsconfig.json`, `wrangler.toml`
  - Install: `@cloudflare/workers-types`, `wrangler`, `hono`, `zod`, `@atproto/api`, `vitest`, `@cloudflare/vitest-pool-workers`
  - Configure: TypeScript target ES2022, module ESNext, Cloudflare Workers runtime

- [x] **T003** [P] Configure ESLint and Prettier for TypeScript
  - Files: `.eslintrc.json`, `.prettierrc`
  - Rules: TypeScript strict mode, Cloudflare Workers best practices
  - Verify: `npm run lint` passes on empty project

- [x] **T004** Initialize D1 database schema from data-model.md
  - Files: `schema.sql` (from data-model.md:354-468)
  - Create: 6 tables (communities, theme_feeds, memberships, post_index, owner_transition_log, achievements)
  - Add: Indexes, constraints, PRAGMA foreign_keys = ON
  - Run: `wrangler d1 execute atrarium-db --local --file=./schema.sql`
  - Verify: All 6 tables created successfully

- [x] **T005** Configure Cloudflare Workers bindings in wrangler.toml
  - Files: `wrangler.toml`
  - Add: D1 database binding (DB), KV namespace binding (POST_CACHE)
  - Add: Cron trigger (0 */12 * * *) for post deletion sync
  - Add: Environment variables (ENVIRONMENT)
  - Verify: `wrangler dev` starts without errors

- [x] **T006** [P] Create TypeScript type definitions from data-model.md
  - Files: `src/types.ts`
  - Define: Community, ThemeFeed, Membership, PostIndex, OwnerTransitionLog interfaces
  - Define: Env type with D1Database, KVNamespace bindings
  - Define: Stage, Role, Status enums
  - Verify: Types match data-model.md:554-601

---

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (T007-T014) - AT Protocol Feed Generator API

- [ ] **T007** [P] Contract test GET /.well-known/did.json
  - Files: `tests/contract/feed-generator/did-document.test.ts`
  - Test: DID document format (feed-generator-api.yaml:24-53)
  - Verify: `@context`, `id`, `service` structure
  - Expected: FAIL (endpoint not implemented)

- [ ] **T008** [P] Contract test GET /xrpc/app.bsky.feed.describeFeedGenerator
  - Files: `tests/contract/feed-generator/describe-feed-generator.test.ts`
  - Test: Feed metadata response (feed-generator-api.yaml:55-79)
  - Verify: `did`, `feeds` array structure
  - Expected: FAIL (endpoint not implemented)

- [ ] **T009** [P] Contract test GET /xrpc/app.bsky.feed.getFeedSkeleton
  - Files: `tests/contract/feed-generator/get-feed-skeleton.test.ts`
  - Test: Feed skeleton response, pagination (feed-generator-api.yaml:81-100)
  - Verify: `feed`, `cursor` format, limit/cursor parameters
  - Expected: FAIL (endpoint not implemented)

### Contract Tests (T010-T014) - Dashboard API

- [ ] **T010** [P] Contract test POST /api/auth/login
  - Files: `tests/contract/dashboard/auth-login.test.ts`
  - Test: OAuth redirect response (dashboard-api.yaml:30-60)
  - Verify: 302 redirect with Location header
  - Expected: FAIL (endpoint not implemented)

- [ ] **T011** [P] Contract test GET /api/communities
  - Files: `tests/contract/dashboard/communities-list.test.ts`
  - Test: List communities response (dashboard-api.yaml:92-100)
  - Verify: JWT auth, communities array, pagination
  - Expected: FAIL (endpoint not implemented)

- [ ] **T012** [P] Contract test POST /api/communities
  - Files: `tests/contract/dashboard/communities-create.test.ts`
  - Test: Create community request/response
  - Verify: name, description, stage=theme, memberCount=1
  - Expected: FAIL (endpoint not implemented)

- [ ] **T013** [P] Contract test GET /api/communities/{id}/feeds
  - Files: `tests/contract/dashboard/theme-feeds-list.test.ts`
  - Test: List theme feeds for community
  - Verify: JWT auth, feeds array
  - Expected: FAIL (endpoint not implemented)

- [ ] **T014** [P] Contract test POST /api/posts
  - Files: `tests/contract/dashboard/posts-submit.test.ts`
  - Test: Submit post URI to theme feed
  - Verify: uri, feedId, authorDid validation
  - Expected: FAIL (endpoint not implemented)

### Integration Tests (T015-T020) - User Scenarios from quickstart.md

- [ ] **T015** [P] Integration test: Create community workflow (Scenario 1)
  - Files: `tests/integration/community-creation.test.ts`
  - Test: quickstart.md:213-253 (auth → create community → verify owner)
  - Verify: Community created, owner assigned, memberCount=1
  - Expected: FAIL (implementation not complete)

- [ ] **T016** [P] Integration test: Create theme feed workflow (Scenario 2)
  - Files: `tests/integration/theme-feed-lifecycle.test.ts`
  - Test: quickstart.md:262-296 (create feed → verify active status)
  - Verify: Feed created, status=active, health metrics=0
  - Expected: FAIL (implementation not complete)

- [ ] **T017** [P] Integration test: Post to feed workflow (Scenario 3)
  - Files: `tests/integration/post-workflow.test.ts`
  - Test: quickstart.md:299-328 (submit post URI → verify indexed)
  - Verify: Post indexed in D1, last_post_at updated, postCount incremented
  - Expected: FAIL (implementation not complete)

- [ ] **T018** [P] Integration test: Retrieve feed skeleton workflow (Scenario 4)
  - Files: `tests/integration/feed-skeleton-retrieval.test.ts`
  - Test: quickstart.md:331-351 (getFeedSkeleton → verify URIs)
  - Verify: Post URIs returned, cursor provided, AT Protocol format
  - Expected: FAIL (implementation not complete)

- [ ] **T019** [P] Integration test: Join community workflow (Scenario 5)
  - Files: `tests/integration/membership-join.test.ts`
  - Test: quickstart.md:354-384 (second user joins → verify membership)
  - Verify: Membership created, role=member, memberCount incremented
  - Expected: FAIL (implementation not complete)

- [ ] **T020** [P] Integration test: Feed inactivity detection (Scenario 6)
  - Files: `tests/integration/feed-health-monitoring.test.ts`
  - Test: quickstart.md:386-419 (last_post_at > 7 days → status=warning)
  - Verify: Scheduled job triggers, status changes active→warning
  - Expected: FAIL (implementation not complete)

---

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Layer (T021)

- [x] **T021** Database service layer with D1 Sessions API
  - Files: `src/services/db.ts`
  - Implement: Query helper with read replication (research.md:122-131)
  - Implement: Batch operations (research.md:153-160)
  - Implement: Error handling with retry (research.md:162-181)
  - Verify: Session API enabled, retryable errors handled

### Models (T022-T027)

- [x] **T022** [P] Community model with validation
  - Files: `src/models/community.ts`
  - Implement: Community CRUD operations (data-model.md:39-118)
  - Implement: Stage transitions (theme→community→graduated)
  - Implement: Feed mix validation (sum = 1.0)
  - Verify: Tests T007, T015 pass

- [x] **T023** [P] ThemeFeed model with health metrics
  - Files: `src/models/theme-feed.ts`
  - Implement: ThemeFeed CRUD operations (data-model.md:120-184)
  - Implement: Status transitions (active→warning→archived)
  - Implement: Health metrics calculation (posts_7d, active_users_7d)
  - Verify: Tests T013, T016 pass

- [x] **T024** [P] Membership model with role-based access
  - Files: `src/models/membership.ts`
  - Implement: Membership CRUD operations (data-model.md:186-232)
  - Implement: Role validation (owner/moderator/member)
  - Implement: Owner transfer logic (FR-040, FR-041)
  - Verify: Tests T011, T019 pass

- [x] **T025** [P] PostIndex model with URI validation
  - Files: `src/models/post-index.ts`
  - Implement: PostIndex CRUD operations (data-model.md:234-281)
  - Implement: AT-URI format validation (at://did:plc:xxx/app.bsky.feed.post/yyy)
  - Implement: Duplicate URI prevention (UNIQUE constraint)
  - Verify: Tests T014, T017 pass

- [x] **T026** [P] OwnerTransitionLog model for audit trail
  - Files: `src/models/owner-transition-log.ts`
  - Implement: Log entry creation (data-model.md:283-323)
  - Implement: Transition reason validation (deletion/inactivity/vacation/manual)
  - Verify: Owner transitions logged correctly

- [x] **T027** [P] Achievement model (stub for Phase 1+)
  - Files: `src/models/achievement.ts`
  - Implement: Minimal achievement CRUD (data-model.md:325-348)
  - Note: Not used in Phase 0, included for schema completeness

### Services (T028-T032)

- [x] **T028** [P] Authentication service with JWT and DID verification
  - Files: `src/services/auth.ts`
  - Implement: OAuth 2.1 flow (research.md:268-335)
  - Implement: JWT creation and verification (dashboard JWT, service JWT)
  - Implement: DID verification with @atproto/xrpc-server (research.md:314-334)
  - Verify: Tests T010 passes

- [x] **T029** [P] Cache service with KV cache-aside pattern
  - Files: `src/services/cache.ts`
  - Implement: Post metadata caching (7-day TTL, research.md:134-151)
  - Implement: Cache invalidation on deletion
  - Verify: KV read/write operations work correctly

- [x] **T030** [P] AT Protocol service for post retrieval
  - Files: `src/services/atproto.ts`
  - Implement: Post existence check (for deletion sync, research.md:387-413)
  - Implement: Post metadata fetching from Bluesky PDS
  - Use: @atproto/api library
  - Verify: Posts can be fetched from Bluesky network

- [x] **T031** [P] DID document generator
  - Files: `src/utils/did.ts`
  - Implement: did:web document generation (research.md:214-266)
  - Implement: Hostname validation to prevent spoofing
  - Verify: Tests T007 passes

- [x] **T032** [P] Validation schemas with zod
  - Files: `src/schemas/validation.ts`
  - Implement: Request validation for all dashboard endpoints
  - Implement: AT-URI pattern validation
  - Implement: DID pattern validation
  - Verify: Invalid requests rejected with 400 errors

### Routes - AT Protocol Feed Generator (T033-T035)

- [ ] **T033** Route GET /.well-known/did.json
  - Files: `src/routes/feed-generator.ts`
  - Implement: DID document endpoint (feed-generator-api.yaml:24-53)
  - Use: DID generator from T031
  - Verify: Tests T007 passes

- [ ] **T034** Route GET /xrpc/app.bsky.feed.describeFeedGenerator
  - Files: `src/routes/feed-generator.ts`
  - Implement: Feed metadata endpoint (feed-generator-api.yaml:55-79)
  - Query: D1 for active theme feeds
  - Return: Feed URIs with display names
  - Verify: Tests T008 passes

- [ ] **T035** Route GET /xrpc/app.bsky.feed.getFeedSkeleton with pagination
  - Files: `src/routes/feed-generator.ts`
  - Implement: Feed skeleton endpoint (feed-generator-api.yaml:81-100)
  - Query: D1 post_index with cursor-based pagination (data-model.md:476-487)
  - Implement: Cursor format {timestamp}::{cid}
  - Cache: Check KV before D1 query
  - Verify: Tests T009, T018 pass, <200ms p95 latency

### Routes - Dashboard API (T036-T040)

- [ ] **T036** Route POST /api/auth/login and GET /api/auth/callback
  - Files: `src/routes/auth.ts`
  - Implement: OAuth login initiation (dashboard-api.yaml:30-60)
  - Implement: OAuth callback handling (dashboard-api.yaml:62-90)
  - Use: Auth service from T028
  - Verify: Tests T010 passes

- [ ] **T037** Routes GET /api/communities and POST /api/communities
  - Files: `src/routes/communities.ts`
  - Implement: List communities (dashboard-api.yaml:92-100)
  - Implement: Create community with owner assignment
  - Use: Community model from T022, Membership model from T024
  - Verify: Tests T011, T012, T015 pass

- [ ] **T038** Routes for theme feeds (GET/POST /api/communities/{id}/feeds)
  - Files: `src/routes/theme-feeds.ts`
  - Implement: List theme feeds for community
  - Implement: Create theme feed (owner/moderator only)
  - Use: ThemeFeed model from T023
  - Verify: Tests T013, T016 pass

- [ ] **T039** Route POST /api/posts for post submission
  - Files: `src/routes/posts.ts`
  - Implement: Submit post URI to theme feed
  - Validate: AT-URI format, feed exists, user is member
  - Update: Feed health metrics (last_post_at, posts_7d)
  - Cache: Store metadata in KV
  - Verify: Tests T014, T017 pass

- [ ] **T040** Route POST /api/communities/{id}/members for membership
  - Files: `src/routes/memberships.ts`
  - Implement: Join community (create membership with role=member)
  - Update: Community member_count
  - Verify: Tests T019 passes

---

## Phase 3.4: Integration & Polish (T041-T042)

- [ ] **T041** Main router with Hono and error handling
  - Files: `src/index.ts`
  - Implement: Hono router setup with all routes
  - Implement: Global error handler
  - Implement: CORS middleware
  - Implement: Request/response logging
  - Export: Default Workers handler
  - Verify: `npm run dev` starts successfully

- [ ] **T042** Scheduled job for post deletion sync (Cron Trigger)
  - Files: `src/index.ts` (scheduled event handler)
  - Implement: Batch validation of recent posts (research.md:387-413)
  - Implement: Delete missing posts from D1 and KV
  - Schedule: Every 12 hours (wrangler.toml crons)
  - Verify: Tests T020 passes, scheduled trigger works

---

## Dependencies

```
Setup (T001-T006)
    ↓
Tests (T007-T020) - MUST FAIL
    ↓
Database Layer (T021)
    ↓
Models (T022-T027) [P - all parallel]
    ↓
Services (T028-T032) [P - all parallel]
    ↓
Routes (T033-T040) [P within groups]
    ↓
Integration (T041-T042)
```

### Critical Paths
1. **Feed Generation**: T021 → T025 → T029 → T035 → T041 (fastest path to working feed)
2. **Community Creation**: T021 → T022 → T024 → T037 → T041
3. **Post Submission**: T021 → T025 → T029 → T039 → T041
4. **AT Protocol Compliance**: T031 → T033, T034, T035

### Parallel Execution Opportunities
- **Contract tests** (T007-T014): All 8 can run in parallel
- **Integration tests** (T015-T020): All 6 can run in parallel
- **Models** (T022-T027): All 6 can run in parallel after T021
- **Services** (T028-T032): All 5 can run in parallel after T022-T027
- **Routes** (T033-T040): Groups can run in parallel (T033-T035 for Feed Generator, T036-T040 for Dashboard)

---

## Parallel Execution Example

### Phase 3.2: Launch all contract tests together
```bash
# Using Task subagent to run tests in parallel:
# (Assuming Task tool exists for parallel test execution)

Task: "Contract test GET /.well-known/did.json in tests/contract/feed-generator/did-document.test.ts"
Task: "Contract test GET /xrpc/app.bsky.feed.describeFeedGenerator in tests/contract/feed-generator/describe-feed-generator.test.ts"
Task: "Contract test GET /xrpc/app.bsky.feed.getFeedSkeleton in tests/contract/feed-generator/get-feed-skeleton.test.ts"
Task: "Contract test POST /api/auth/login in tests/contract/dashboard/auth-login.test.ts"
Task: "Contract test GET /api/communities in tests/contract/dashboard/communities-list.test.ts"
Task: "Contract test POST /api/communities in tests/contract/dashboard/communities-create.test.ts"
Task: "Contract test GET /api/communities/{id}/feeds in tests/contract/dashboard/theme-feeds-list.test.ts"
Task: "Contract test POST /api/posts in tests/contract/dashboard/posts-submit.test.ts"
```

### Phase 3.3: Launch all model tasks together
```bash
# After T021 (Database Layer) completes:

Task: "Community model with validation in src/models/community.ts"
Task: "ThemeFeed model with health metrics in src/models/theme-feed.ts"
Task: "Membership model with role-based access in src/models/membership.ts"
Task: "PostIndex model with URI validation in src/models/post-index.ts"
Task: "OwnerTransitionLog model for audit trail in src/models/owner-transition-log.ts"
Task: "Achievement model (stub) in src/models/achievement.ts"
```

---

## Validation Checklist
*GATE: Must pass before marking tasks.md complete*

- [x] All contracts have corresponding tests (8 contracts → T007-T014)
- [x] All entities have model tasks (6 entities → T022-T027)
- [x] All quickstart scenarios have integration tests (6 scenarios → T015-T020)
- [x] All tests come before implementation (T007-T020 before T021-T042)
- [x] Parallel tasks truly independent (different files, no shared state)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] Critical performance target addressed (T035: <200ms p95)
- [x] AT Protocol compliance verified (T007-T009, T033-T035)
- [x] Security addressed (T028: JWT + DID verification, T032: input validation)

---

## Notes for Implementers

### Performance Targets (FR-022, quickstart.md:422-456)
- **Feed generation**: <200ms p95 (T035)
- **API response**: <100ms p95 (all routes)
- **D1 query**: <50ms (T021 with Sessions API)
- **KV access**: <10ms (T029)

### Testing Strategy
1. **Write tests first** (T007-T020) - MUST FAIL before implementation
2. **Run tests continuously**: `npm run test:watch`
3. **Verify contract compliance**: Use OpenAPI validation tools
4. **Performance testing**: Apache Bench (quickstart.md:428-450)

### Cloudflare Workers Constraints
- **10ms-50ms CPU time per request**: Optimize hot paths (T035)
- **D1 free tier**: 5M reads/day, 100k writes/day (monitor usage)
- **KV first 100k reads/day free**: Cache hot post metadata only
- **Serverless execution**: No persistent WebSocket (Firehose deferred to Phase 1+)

### Development Workflow
1. Complete T001-T006 (setup)
2. Complete T007-T020 (tests) - verify all FAIL
3. Complete T021 (database layer)
4. Pick any model from T022-T027 [P] - work on one at a time
5. Pick any service from T028-T032 [P] - work on one at a time
6. Pick routes T033-T040 based on dependencies
7. Complete T041-T042 (integration)
8. Run quickstart.md validation

### Commit Strategy
- Commit after each task (42 commits total)
- Commit message format: `[T###] Task description`
- Example: `[T022] Community model with validation`

---

**Status**: Tasks generated. Ready for Phase 4 (Implementation).
**Next Command**: Begin implementation with `T001` or run `/implement` for guided execution.
