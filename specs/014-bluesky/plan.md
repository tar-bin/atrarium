# Implementation Plan: Internal Post Management (Custom Lexicon)

**Branch**: `014-bluesky` | **Date**: 2025-10-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/workspaces/atrarium/specs/014-bluesky/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path ✅
   → Spec loaded successfully from 014-bluesky/spec.md
2. Fill Technical Context ✅
   → Monorepo structure (server + client + shared/contracts + lexicons)
   → Cloudflare Workers, TypeScript 5.7, React 19
3. Fill Constitution Check section ✅
   → Based on constitution.md v1.3.0
4. Evaluate Constitution Check section ✅
   → No violations, all principles satisfied
   → Update Progress Tracking: Initial Constitution Check ✅
5. Execute Phase 0 → research.md ✅
   → Generated research.md
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, CLAUDE.md update ✅
   → Generated data-model.md, contracts/*, quickstart.md
7. Re-evaluate Constitution Check section ✅
   → No new violations after design
   → Update Progress Tracking: Post-Design Constitution Check ✅
8. Plan Phase 2 → Describe task generation approach ✅
9. STOP - Ready for /tasks command ✅
```

## Summary

Replace `app.bsky.feed.post` with custom `net.atrarium.community.post` Lexicon for community-specific posts. Posts will be stored in user PDSs, indexed via AT Protocol Relay/Firehose (same as existing architecture), and cached in Durable Objects. This decouples community posts from the public Bluesky social graph while maintaining PDS-First Architecture and all constitution principles.

**Key Changes**:
- New Lexicon schema: `net.atrarium.community.post`
- Post creation writes to PDS using custom Lexicon (not `app.bsky.feed.post`)
- Firehose filter updated to index `net.atrarium.community.post` records
- Coexistence of legacy `app.bsky.feed.post` during transition
- Profile data continues to use `app.bsky.actor.profile` (not replaced)
- **Feed Generator API deprecated**: Custom Lexicon posts incompatible with Bluesky AppView
- **Dashboard-only timelines**: Timeline served via Dashboard API, not via AT Protocol Feed Generator

## Technical Context

**Language/Version**: TypeScript 5.7, Node.js (via nodejs_compat)
**Primary Dependencies**:
- Backend: Hono 4.6.14, Zod 4.1.11, @atproto/api 0.13.35, @atproto/identity 0.4.3, oRPC 1.9.3
- Frontend: React 19, TanStack Router v1, TanStack Query v5, shadcn/ui
**Storage**: Durable Objects Storage (per-community isolation), PDS (permanent user data)
**Testing**: Vitest + @cloudflare/vitest-pool-workers (server), Vitest + Testing Library (client), Playwright (E2E)
**Target Platform**: Cloudflare Workers (backend), Cloudflare Pages (frontend)
**Project Type**: Monorepo (lexicons + shared/contracts + server + client)
**Performance Goals**: <200ms feed generation, <100ms API response (p95), <5s indexing latency
**Constraints**: <$5/month for <200 members, PDS-First Architecture, AT Protocol + Lexicon only
**Scale/Scope**: 1000+ communities, 10-200 members each, 7-day feed cache

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Simplicity Principles** (Principle 2):
- ✅ No new projects (extends existing monorepo: lexicons + server + client)
- ✅ No new databases (uses existing Durable Objects Storage + PDS)
- ✅ No new services (extends existing Firehose indexing + Feed Generator)
- ✅ Minimal dependencies (no new libraries, reuses @atproto/api + Zod)

**Technology Choices** (Principle 1, 3):
- ✅ Protocol-first architecture maintained (new Lexicon schema as API contract)
- ✅ Economic efficiency preserved (no additional cost, uses existing Firehose + DO)
- ✅ No framework proliferation (reuses Hono, React 19, TanStack, oRPC)

**Data Ownership** (Principle 4, 5):
- ✅ PDS-first architecture maintained (posts stored in user PDSs, not centralized)
- ✅ Durable Objects used only as 7-day cache (existing pattern)
- ✅ No centralized user database created (DID-based identity preserved)

**Code Quality** (Principle 7):
- ✅ Biome linter checks configured and enforced (existing .husky/pre-commit)
- ✅ Biome formatter checks configured and enforced (biome.json)
- ✅ TypeScript type checks configured and enforced (tsconfig.json, pnpm -r typecheck)
- ✅ Pre-commit validation automated (lint-staged + husky)

**AT Protocol + PDS + Lexicon Constraints** (Principle 8):
- ✅ Feature implementable using AT Protocol + PDS + Lexicon schemas only
- ✅ No separate databases (SQL/NoSQL/KV) introduced beyond Durable Objects cache
- ✅ All persistent state resides in PDS using `net.atrarium.community.post` Lexicon
- ✅ Durable Objects Storage used only as 7-day ephemeral cache (existing pattern)
- ✅ No feature requires additional database infrastructure

**Git Workflow and Commit Integrity** (Principle 9):
- ✅ Implementation plan includes complete commit strategy (Phase 4 execution)
- ✅ Pre-commit hooks will validate all changes (existing .husky/pre-commit)
- ✅ Emergency bypass procedures not applicable (standard development)
- ✅ CI/CD validation independent of local hooks (GitHub Actions ready)

**Conclusion**: ✅ PASS - Feature complies with all constitution principles (v1.3.0)

## Project Structure

### Documentation (this feature)
```
specs/014-bluesky/
├── spec.md             # Feature specification (input)
├── plan.md             # This file (/plan command output)
├── research.md         # Phase 0 output (/plan command)
├── data-model.md       # Phase 1 output (/plan command)
├── quickstart.md       # Phase 1 output (/plan command)
├── contracts/          # Phase 1 output (/plan command)
│   └── post-api.yaml   # OpenAPI spec for post creation/retrieval
└── tasks.md            # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Monorepo structure (pnpm workspaces)
lexicons/
├── net.atrarium.community.config.json       # Existing
├── net.atrarium.community.membership.json   # Existing
├── net.atrarium.moderation.action.json      # Existing
└── net.atrarium.community.post.json         # NEW (014-bluesky)

shared/contracts/
├── src/
│   ├── router.ts       # Update: Add post creation/retrieval endpoints
│   ├── schemas.ts      # Update: Add post validation schemas
│   ├── types.ts        # Auto-generated from schemas.ts
│   └── client-types.ts # Auto-generated RouterClient type

server/
├── src/
│   ├── schemas/
│   │   ├── generated/
│   │   │   └── net.atrarium.community.post.ts  # NEW: Generated from Lexicon
│   │   ├── validation.ts      # Update: Add post validation
│   │   └── lexicon.ts          # Update: Import new Lexicon type
│   ├── services/
│   │   └── atproto.ts          # Update: Add createPost(), getPosts() methods
│   ├── routes/
│   │   └── posts.ts            # NEW: Post creation/retrieval endpoints
│   ├── durable-objects/
│   │   └── community-feed-generator.ts  # Update: Index net.atrarium.community.post
│   └── workers/
│       └── firehose-processor.ts        # Update: Filter net.atrarium.community.post
└── tests/
    ├── contract/
    │   └── posts.test.ts       # NEW: Post API contract tests
    ├── integration/
    │   └── post-flow.test.ts   # NEW: End-to-end post creation → indexing
    └── unit/
        └── post-validation.test.ts  # NEW: Lexicon validation tests

client/
├── src/
│   ├── components/
│   │   └── posts/
│   │       ├── PostCreator.tsx    # Update: Use new post API
│   │       └── PostList.tsx       # Update: Display net.atrarium.community.post
│   ├── lib/
│   │   └── api.ts                 # Update: Add post creation/retrieval methods
│   └── routes/
│       └── communities/$id.tsx    # Update: Post creation UI
└── tests/
    └── components/
        └── PostCreator.test.tsx   # Update: Test new post creation flow
```

**Structure Decision**: Monorepo organization maintained. This feature extends existing `lexicons/`, `shared/contracts/`, `server/`, and `client/` workspaces. No new projects or databases introduced (Principle 2 satisfied).

## Phase 0: Outline & Research

**Research Tasks**:
1. AT Protocol Lexicon schema design patterns for post records
2. Firehose filtering for custom Lexicons (Jetstream WebSocket capabilities)
3. Backward compatibility strategies (coexisting app.bsky.feed.post + net.atrarium.community.post)
4. PDS write operations for custom Lexicons via @atproto/api
5. Durable Objects indexing patterns for multiple record types

**Output**: [research.md](./research.md) with all technical decisions documented

## Phase 1: Design & Contracts

**1. Data Model** ([data-model.md](./data-model.md)):
- Entity: `net.atrarium.community.post`
  - Fields: `text` (string, max 300 chars), `communityId` (string, 8-char hex, immutable), `createdAt` (ISO 8601), `author` (DID reference)
  - Validation: Community membership required, text non-empty, stage-agnostic (works with theme/community/graduated)
  - Relationships: Links to `net.atrarium.community.config`, `net.atrarium.community.membership`
  - Lifecycle: Posts survive stage transitions (communityId remains constant during theme → community → graduated evolution)

**2. API Contracts** ([contracts/post-api.yaml](./contracts/post-api.yaml)):
- `POST /api/communities/{id}/posts` - Create post in PDS
- `GET /api/communities/{id}/posts` - List posts from feed cache
- `GET /api/posts/{uri}` - Get single post by AT-URI

**3. Contract Tests**:
- `server/tests/contract/posts.test.ts` - API endpoint schemas
- Tests must fail initially (TDD approach)

**4. Integration Tests**:
- `server/tests/integration/post-flow.test.ts` - Create post → Firehose → Index → Retrieve

**5. Quickstart** ([quickstart.md](./quickstart.md)):
- Step-by-step: Create post → View in timeline → Verify in PDS
- Test scenario validation from user stories

**6. CLAUDE.md Update**:
- Run `.specify/scripts/bash/update-agent-context.sh claude`
- Add `net.atrarium.community.post` Lexicon to Implementation Status
- Update "Critical Implementation Details" with new Lexicon filtering

**Output**: data-model.md, contracts/*, failing tests, quickstart.md, CLAUDE.md updated

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
1. **Lexicon Definition** (tasks 1-3):
   - Define `net.atrarium.community.post` JSON schema
   - Generate TypeScript types via `pnpm --filter server codegen`
   - Update Lexicon README with new schema

2. **Backend Implementation** (tasks 4-12):
   - Update `shared/contracts/` with post endpoints (schemas + router)
   - Implement PDS write operations in `server/src/services/atproto.ts`
   - Create `server/src/routes/posts.ts` API handlers
   - Update `FirehoseProcessor` to filter `net.atrarium.community.post`
   - Update `CommunityFeedGenerator` to index custom Lexicon posts
   - Implement backward compatibility (coexist with `app.bsky.feed.post`)
   - Deprecate Feed Generator API (`server/src/routes/feed-generator.ts`) - mark as deprecated, add migration notice
   - Write contract tests (`server/tests/contract/posts.test.ts`)
   - Write integration tests (`server/tests/integration/post-flow.test.ts`)

3. **Frontend Implementation** (tasks 13-16):
   - Update `client/src/lib/api.ts` with post creation methods
   - Update `PostCreator.tsx` to use new API
   - Update `PostList.tsx` to display `net.atrarium.community.post`
   - Write component tests

4. **Migration & Validation** (tasks 17-20):
   - Deploy Lexicon schema to production
   - Update Firehose filters in production
   - Test coexistence with legacy posts
   - Execute quickstart.md validation

**Ordering Strategy**:
- TDD order: Contract tests [P] → Integration tests → Implementation
- Dependency order: Lexicon [P] → Contracts [P] → Backend services → API routes → Frontend
- Mark [P] for parallel execution (independent tasks)

**Estimated Output**: 20-25 numbered, dependency-ordered tasks in tasks.md

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*No violations - section intentionally left empty*

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 9 principles satisfied)
- [x] Post-Design Constitution Check: PASS (no new violations)
- [ ] Test Coverage Gate: PASS (after Phase 4)
- [ ] Performance Gate: PASS (after Phase 5)

**Execution Log**:
- 2025-10-08 10:00: Spec loaded, Technical Context filled
- 2025-10-08 10:05: Constitution Check evaluated (PASS)
- 2025-10-08 10:10: Phase 0 research.md generated
- 2025-10-08 10:20: Phase 1 design artifacts generated
- 2025-10-08 10:25: Constitution re-check (PASS), ready for /tasks
