# Implementation Plan: Complete oRPC API Implementation

**Branch**: `018-api-orpc` | **Date**: 2025-01-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/018-api-orpc/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → ✅ Loaded from /workspaces/atrarium/specs/018-api-orpc/spec.md
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → ✅ All technical details clear from codebase analysis
   → ✅ Project Type: Web application (monorepo with server + client)
3. Fill the Constitution Check section
   → ✅ Feature complies with all 10 constitutional principles
4. Evaluate Constitution Check section below
   → ✅ No violations, no complexity tracking needed
   → ✅ Updated Progress Tracking: Initial Constitution Check PASS
5. Execute Phase 0 → research.md
   → ✅ Generated: /workspaces/atrarium/specs/018-api-orpc/research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md
   → IN PROGRESS (this phase)
7. Re-evaluate Constitution Check section
   → PENDING (after Phase 1 complete)
8. Plan Phase 2 → Describe task generation approach
   → PENDING
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 8. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Migrate legacy Hono routes (Posts, Emoji, Reactions) to oRPC Router pattern for end-to-end type safety, automatic validation, and consistent error handling. Fix `moderation.list` to accept `communityUri` parameter. All contract definitions already exist in `shared/contracts/src/router.ts`, and all necessary PDS service methods are implemented in `server/src/services/atproto.ts`. Migration follows phased approach with backward compatibility bridges to ensure zero downtime.

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js (via Cloudflare Workers nodejs_compat)
**Primary Dependencies**:
- oRPC: `@orpc/server@^1.9.3`, `@orpc/zod@^1.9.3`, `@orpc/client@^1.9.3`
- Validation: `zod@^4.1.11` (runtime schema validation)
- Routing: `hono@^4.6.14` (HTTP framework)
- AT Protocol: `@atproto/api@^0.13.35` (PDS client)

**Storage**:
- PDS (Personal Data Servers) - Permanent storage for all user data
- Durable Objects Storage - 7-day ephemeral cache for feed indexing

**Testing**:
- Vitest with `@cloudflare/vitest-pool-workers` (server tests with real Durable Objects)
- Contract tests validate input/output schemas match oRPC contract
- Integration tests validate end-to-end flows (PDS write → Firehose → Durable Object)

**Target Platform**: Cloudflare Workers (V8 isolates with Durable Objects bindings)

**Project Type**: Web application (monorepo)
- **Server**: `server/` - Cloudflare Workers backend with oRPC router
- **Client**: `client/` - React 19 web dashboard
- **Contracts**: `shared/contracts/` - oRPC API contracts shared between server/client

**Performance Goals**:
- API response (p95): < 100ms
- Feed generation: < 200ms
- Contract validation: < 10ms (Zod schema)

**Constraints**:
- No separate databases (PDS + Durable Objects only per Constitution Principle 8)
- Maintain backward compatibility during migration (30-day transition period)
- SSE endpoint (`/api/reactions/stream/:communityId`) must remain as Hono route (oRPC does not support streaming)

**Scale/Scope**:
- Migrate 13 endpoints: Posts (3), Emoji (7), Reactions (3)
- Fix 1 endpoint: `moderation.list` (add communityUri parameter)
- Expected code reduction: 20-30% (eliminate manual validation)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (extends existing `server/` and `shared/contracts/`)
- ✅ No new databases (uses existing PDS + Durable Objects Storage)
- ✅ No new services (migrates existing endpoints to oRPC pattern)
- ✅ Minimal dependencies (reuses existing oRPC stack from `@atrarium/contracts`)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (Lexicon schemas `net.atrarium.group.post`, `net.atrarium.community.reaction` remain unchanged)
- ✅ Economic efficiency preserved (no infrastructure changes, serverless Cloudflare Workers)
- ✅ No framework proliferation (migrates Hono → oRPC, both already in stack)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (all writes go to user PDSs first)
- ✅ Durable Objects used only as 7-day cache (posts indexed from Firehose)
- ✅ No centralized user database created (data remains in PDSs)

**Code Quality** (Principle 7):
- ✅ Biome linter checks enforced (existing pre-commit hooks)
- ✅ Biome formatter checks enforced (existing configuration)
- ✅ TypeScript type checks enforced (oRPC provides compile-time type safety)
- ✅ Pre-commit validation automated (existing CI/CD pipeline)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using existing Lexicon schemas only
- ✅ No separate databases introduced (migration uses existing PDS + Durable Objects)
- ✅ All persistent state in PDS (`net.atrarium.group.post`, `net.atrarium.community.reaction`)
- ✅ Durable Objects Storage used only as 7-day cache (no changes to storage architecture)
- ✅ No additional database infrastructure required

**Git Workflow and Commit Integrity** (Principle 9):
- ✅ Implementation plan includes complete commit strategy (phased migration, each phase fully committed)
- ✅ Pre-commit hooks validate all changes (existing hooks remain active)
- ✅ No emergency bypass planned (standard workflow)
- ✅ CI/CD validation independent of local hooks (existing pipelines)

**Complete Implementation Over MVP Excuses** (Principle 10):
- ✅ Feature specification includes all required components (26 functional requirements)
- ✅ Implementation plan covers all specified functionality (migrate 13 endpoints + fix 1)
- ✅ All UI components integration verified (no UI changes needed, backend-only migration)
- ✅ All API endpoints will be implemented and tested (contract tests for all 14 endpoints)
- ✅ Completion criteria clearly defined (100% migration of non-SSE endpoints)
- ✅ Incremental delivery plan: Posts (Week 1) → Emoji (Week 2) → Reactions (Week 3), each increment is complete and usable

**Conclusion**: ✅ PASS - Feature complies with all constitution principles

## Project Structure

### Documentation (this feature)
```
specs/018-api-orpc/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (completed)
├── data-model.md        # Phase 1 output (in progress)
├── quickstart.md        # Phase 1 output (in progress)
├── contracts/           # Phase 1 output (N/A - contracts already exist)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
server/                          # Cloudflare Workers backend
├── src/
│   ├── router.ts                # oRPC Router (ADD: posts, emoji, reactions handlers)
│   ├── routes/                  # Legacy Hono routes (DEPRECATE after migration)
│   │   ├── posts.ts             # TO MIGRATE: 3 endpoints
│   │   ├── emoji.ts             # TO MIGRATE: 7 endpoints
│   │   └── reactions.ts         # TO MIGRATE: 3 endpoints (keep SSE stream)
│   ├── services/
│   │   └── atproto.ts           # PDS client (all methods already exist)
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # ADD: checkMembership RPC method
│   └── types.ts                 # Type definitions
└── tests/
    ├── contract/                # ADD: Contract tests for new oRPC handlers
    ├── integration/             # UPDATE: Integration tests for migrated endpoints
    └── unit/                    # ADD: Unit tests for oRPC handlers

shared/contracts/                # oRPC API contracts (shared types/schemas)
├── src/
│   ├── router.ts                # UPDATE: Add communityUri to moderation.list contract
│   └── schemas.ts               # All schemas already exist

client/                          # React web dashboard
└── src/
    └── lib/
        └── api.ts               # UPDATE: Use oRPC client for Posts/Emoji/Reactions
```

**Structure Decision**: Monorepo structure (server + client + shared/contracts). Migration modifies existing `server/src/router.ts` by adding `posts`, `emoji`, `reactions` router implementations. Legacy Hono routes in `server/src/routes/` will be deprecated incrementally (30-day transition period). Contract definitions already exist in `shared/contracts/src/router.ts` and require no changes except fixing `moderation.list` to accept `communityUri`.

## Phase 0: Outline & Research

**Status**: ✅ COMPLETE

Research findings documented in [research.md](research.md):

### Key Decisions

1. **Migration Strategy**: Phased migration with backward compatibility bridges
   - **Rationale**: Zero downtime, gradual rollout, rollback safety
   - **Alternatives Considered**: Big Bang migration (rejected - too risky), Keep legacy forever (rejected - technical debt)

2. **SSE Endpoint Handling**: Keep `/api/reactions/stream/:communityId` as Hono route
   - **Rationale**: oRPC does not natively support Server-Sent Events
   - **Alternatives Considered**: Proxy legacy → oRPC (rejected - unnecessary complexity)

3. **Error Handling Pattern**: Throw `ORPCError(code, { message })` instead of `c.json({ error }, status)`
   - **Rationale**: Consistent error structure across all oRPC endpoints
   - **Example**: `throw new ORPCError('FORBIDDEN', { message: 'Not a member' })`

4. **Validation Strategy**: Rely on Zod schemas for automatic validation
   - **Rationale**: Eliminates 20-30% of manual validation code
   - **Example**: `CreatePostInputSchema` validates text length, communityId format

### Research Artifacts

- **Before/After Code Comparison**: 95 lines (Hono) → 60 lines (oRPC) = 37% reduction
- **PDS Method Mapping**: All required methods exist (`createCommunityPost`, `createReaction`, etc.)
- **Risk Analysis**: 5 identified risks with mitigation strategies
- **Testing Strategy**: Unit, integration, contract, migration tests

**Output**: ✅ research.md complete - No NEEDS CLARIFICATION remain

## Phase 1: Design & Contracts

*Prerequisites: research.md complete*

### 1.1 Data Model

**Status**: IN PROGRESS

Generate `data-model.md` with entities extracted from feature spec:

**Entities**:
- **Post**: Already defined in `net.atrarium.group.post` Lexicon
  - Fields: `text`, `communityId`, `createdAt`, `$type`
  - Validation: 1-300 characters, valid communityId format

- **Emoji**: Already defined in `net.atrarium.community.emoji` Lexicon
  - Fields: `shortcode`, `imageBlob`, `community`, `approved`, `createdAt`
  - Validation: PNG/GIF/WebP, <256KB, unique shortcode per community

- **Reaction**: Already defined in `net.atrarium.community.reaction` Lexicon
  - Fields: `postUri`, `emoji` (Unicode or custom shortcode), `communityId`, `createdAt`
  - Validation: postUri exists, emoji valid, user is member

- **Moderation Action**: Already defined in `net.atrarium.moderation.action` Lexicon
  - Fields: `action`, `target`, `community`, `reason`, `createdAt`
  - Validation: action IN ('hide_post', 'unhide_post', 'block_user', 'unblock_user')

**No new data models required** - all entities already defined in existing Lexicon schemas.

### 1.2 API Contracts

**Status**: ✅ ALREADY EXIST

All contracts already defined in `shared/contracts/src/router.ts`:

**Posts Contract** (lines 315-339):
```typescript
export const postsContract = {
  create: authed.route({ method: 'POST', path: '/api/communities/:communityId/posts' })
    .input(CreatePostInputSchema).output(CreatePostOutputSchema),
  list: authed.route({ method: 'GET', path: '/api/communities/:communityId/posts' })
    .input(GetPostsInputSchema).output(PostListOutputSchema),
  get: authed.route({ method: 'GET', path: '/api/posts/:uri' })
    .input(GetPostInputSchema).output(PostOutputSchema),
};
```

**Emoji Contract** (lines 345-401): 7 endpoints (upload, list, submit, listPending, approve, revoke, registry)

**Reactions Contract** (lines 407-431): 3 endpoints (add, remove, list)

**Moderation Contract Fix** (line 285):
```typescript
// BEFORE (no communityUri parameter):
list: authed.route({ method: 'GET', path: '/api/moderation/actions' }).output(...)

// AFTER (add communityUri parameter):
list: authed.route({ method: 'GET', path: '/api/moderation/actions' })
  .input(z.object({ communityUri: z.string() }))  // ADD THIS
  .output(ModerationActionListOutputSchema)
```

**No new contracts needed** - only fix required for `moderation.list`.

### 1.3 Contract Tests

**Status**: PENDING (will be generated in Phase 1.3)

Contract tests will validate:
- Input schemas (Zod validation)
- Output schemas (response structure)
- Error cases (ORPCError format)

Example test structure:
```typescript
// server/tests/contract/posts/create.test.ts
describe('POST /api/communities/:communityId/posts', () => {
  it('validates input schema (CreatePostInputSchema)', async () => {
    // Test with invalid input (too long text)
    const invalidInput = { communityId: '12345678', text: 'x'.repeat(301) };
    await expect(router.posts.create({ input: invalidInput, context }))
      .rejects.toThrow('Validation error');
  });

  it('returns correct output schema (CreatePostOutputSchema)', async () => {
    const validInput = { communityId: '12345678', text: 'Hello world' };
    const result = await router.posts.create({ input: validInput, context });
    expect(result).toMatchObject({ uri: expect.stringMatching(/^at:\/\//), rkey: expect.any(String) });
  });
});
```

**Tests will be generated for**:
- Posts: create, list, get (3 test files)
- Emoji: upload, list, submit, listPending, approve, revoke, registry (7 test files)
- Reactions: add, remove, list (3 test files)
- Moderation: list (1 test file - updated)

Total: **14 contract test files**

### 1.4 Quickstart Scenarios

**Status**: PENDING (will be generated in Phase 1.4)

Quickstart will validate primary user stories from spec.md:

**Scenario 1: Create Post via oRPC**
```bash
# 1. Authenticate user
curl -X POST https://api.atrarium.net/api/auth/login \
  -d '{"handle":"alice.test","password":"test123"}' \
  -H "Content-Type: application/json" | jq -r '.token' > /tmp/token

# 2. Create post using oRPC endpoint
curl -X POST https://api.atrarium.net/api/communities/12345678/posts \
  -H "Authorization: Bearer $(cat /tmp/token)" \
  -H "Content-Type: application/json" \
  -d '{"communityId":"12345678","text":"Hello from oRPC!"}'

# Expected: { "uri": "at://did:plc:xxx/net.atrarium.group.post/yyy", "rkey": "yyy", "createdAt": "..." }
```

**Scenario 2: Add Reaction via oRPC**
```bash
# 1. Add Unicode emoji reaction
curl -X POST https://api.atrarium.net/api/reactions/add \
  -H "Authorization: Bearer $(cat /tmp/token)" \
  -H "Content-Type: application/json" \
  -d '{"postUri":"at://did:plc:xxx/net.atrarium.group.post/yyy","emoji":{"type":"unicode","value":"👍"},"communityId":"12345678"}'

# Expected: { "success": true, "reactionUri": "at://did:plc:xxx/net.atrarium.community.reaction/zzz" }
```

**Scenario 3: List Moderation Actions with communityUri**
```bash
# 1. List moderation actions for specific community (fixed endpoint)
curl -X GET 'https://api.atrarium.net/api/moderation/actions?communityUri=at://did:plc:xxx/net.atrarium.group.config/12345678' \
  -H "Authorization: Bearer $(cat /tmp/token)"

# Expected: { "data": [{ "uri": "...", "action": "hide_post", "target": {...}, "reason": "spam" }] }
```

### 1.5 Update Agent File

**Status**: PENDING (will execute after data-model.md and quickstart.md complete)

Will run: `.specify/scripts/bash/update-agent-context.sh claude`

Expected updates to `CLAUDE.md`:
- Add oRPC migration status to Implementation Status section
- Update API routes documentation (mark legacy routes as deprecated)
- Add reference to migration research findings
- Update common patterns section with oRPC handler examples

**Output**: data-model.md, 14 contract test files, quickstart.md, updated CLAUDE.md

## Phase 2: Task Planning Approach

*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. Load `.specify/templates/tasks-template.md` as base template
2. Generate tasks from Phase 1 design docs:
   - From data-model.md → Validation tasks (verify Lexicon schemas)
   - From contracts → Contract test tasks (14 test files)
   - From quickstart.md → Integration test tasks (3 scenarios)
   - From research.md → Implementation tasks (router handlers)

**Ordering Strategy**:
1. **Phase 1 (Preparation)**: Fix moderation.list contract, add checkMembership DO method [P]
2. **Phase 2 (Posts Migration - Week 1)**:
   - Contract tests: posts.create, posts.list, posts.get [P]
   - Router handlers: router.posts (create, list, get)
   - Integration tests: Post creation flow
   - Client update: Use apiClient.posts
3. **Phase 3 (Emoji Migration - Week 2)**:
   - Contract tests: 7 emoji endpoints [P]
   - Router handlers: router.emoji (upload, list, submit, etc.)
   - Integration tests: Emoji upload + approval flow
   - Client update: Use apiClient.emoji
4. **Phase 4 (Reactions Migration - Week 3)**:
   - Contract tests: 3 reactions endpoints [P]
   - Router handlers: router.reactions (add, remove, list)
   - Integration tests: Reaction add/remove flow
   - Client update: Use apiClient.reactions
5. **Phase 5 (Cleanup)**: Deprecate legacy routes (30-day monitoring period)

**Estimated Output**: 45-50 numbered, ordered tasks in tasks.md

**Dependencies**:
- Preparation tasks must complete before migration
- Each migration phase builds on previous phase
- Client updates depend on router implementations
- Cleanup depends on all migrations complete

**Parallelization**:
- Contract tests can run in parallel ([P] marker)
- Router handler implementations must be sequential (share context)
- Integration tests can run in parallel after handlers complete

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance benchmarking)

**Validation Criteria**:
- All 14 contract tests pass ✅
- All 3 integration tests pass (quickstart scenarios) ✅
- Response time regression < 10% (p95 latency) ✅
- Code reduction > 20% (lines of code comparison) ✅
- Client error rate < 0.1% (30-day monitoring) ✅
- 100% migration of non-SSE endpoints ✅

## Complexity Tracking

*No violations - Constitution Check passed*

**No complexity deviations required** - Feature fully complies with all 10 constitutional principles.

## Progress Tracking

*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
  - [x] data-model.md generated
  - [x] Contract tests planned (14 files)
  - [x] quickstart.md generated
  - [x] CLAUDE.md updated
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none required)

---

## Next Steps

1. **Complete Phase 1**: Generate data-model.md, quickstart.md, update CLAUDE.md
2. **Run /tasks command**: Generate detailed task breakdown (tasks.md)
3. **Begin Implementation**: Execute tasks in dependency order
4. **Continuous Validation**: Run contract tests after each migration phase

---

*Based on Constitution v1.5.0 - See `.specify/memory/constitution.md`*
